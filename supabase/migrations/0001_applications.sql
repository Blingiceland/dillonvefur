-- Play at Dillon: band booking applications
-- Applied through the Supabase MCP tools / SQL editor. Keep in sync with the plan in
-- ~/.claude/plans/l-kkum-t-luna-over-federated-meerkat.md

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.application_status as enum (
    'pending_payment', -- created, booking fee not yet paid (phase 5 only)
    'submitted',       -- waiting for the owner
    'approved',        -- on the schedule
    'rejected',
    'played',
    'cancelled',       -- by the venue after approval
    'withdrawn'        -- by the band
);

create type public.fee_status as enum (
    'none', 'pending', 'paid', 'refund_pending', 'refunded', 'refund_failed'
);

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create table public.applications (
    id                   uuid primary key default gen_random_uuid(),
    ref                  text not null unique,                 -- short public code, e.g. DLN-4F2A9C
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now(),
    status               public.application_status not null default 'submitted',
    ip_hash              text,
    user_agent           text,

    -- the band
    band_name            text not null,
    genre                text not null,
    based_in             text,
    bio                  text not null,
    previous_gigs        text,
    line_up              text not null,
    tech_needs           text,
    audience_estimate    text not null check (audience_estimate in ('under_30', '30_60', '60_100', 'over_100')),

    -- listen / socials (at least one listen link enforced by the API)
    spotify_url          text,
    youtube_url          text,
    soundcloud_url       text,
    bandcamp_url         text,
    instagram_url        text,
    facebook_url         text,
    website_url          text,

    -- the show
    entry_type           text not null check (entry_type in ('free', 'ticketed')),
    ticket_price_isk     integer check (ticket_price_isk is null or ticket_price_isk between 500 and 20000),
    ticket_url           text,
    suggested_start_time text not null default '21:00',

    -- dates (ISO dates; Iceland is UTC all year)
    preferred_date       date not null,
    alt_date_1           date,
    alt_date_2           date,
    confirmed_date       date,
    start_time           text,

    -- contact (never shown publicly)
    contact_name         text not null,
    contact_email        text not null,
    contact_phone        text not null,

    -- media (storage object paths in bucket band-media)
    press_photo_path     text not null,
    poster_path          text,

    -- decision / schedule bookkeeping
    admin_note           text,
    decision_message     text,
    decided_at           timestamptz,
    played_at            timestamptz,
    sheet_tab            text,
    sheet_row            integer,
    event_slug           text,
    last_error           text,

    -- booking fee (phase 5)
    fee_status           public.fee_status not null default 'none',
    fee_amount_isk       integer not null default 10000,
    teya_session_id      text,
    teya_transaction_id  text,
    teya_refund_id       text,
    paid_at              timestamptz,
    refunded_at          timestamptz,

    constraint alt_dates_distinct check (
        (alt_date_1 is null or alt_date_1 <> preferred_date) and
        (alt_date_2 is null or (alt_date_2 <> preferred_date and alt_date_2 is distinct from alt_date_1))
    ),
    constraint ticket_price_when_ticketed check (entry_type = 'free' or ticket_price_isk is not null)
);

create index applications_status_preferred_idx on public.applications (status, preferred_date);
create index applications_contact_idx on public.applications (contact_email, created_at desc);
create index applications_ip_idx on public.applications (ip_hash, created_at desc);
-- one approved act per night
create unique index applications_one_per_night on public.applications (confirmed_date) where status = 'approved';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger applications_set_updated_at
    before update on public.applications
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- application_log: who did what, when (band / admin / system / teya)
-- ---------------------------------------------------------------------------
create table public.application_log (
    id             bigint generated always as identity primary key,
    application_id uuid not null references public.applications (id) on delete cascade,
    at             timestamptz not null default now(),
    actor          text not null check (actor in ('band', 'admin', 'system', 'teya')),
    type           text not null,
    payload        jsonb,
    external_id    text unique   -- e.g. Teya event/transaction id, makes webhooks idempotent
);

create index application_log_app_idx on public.application_log (application_id, at desc);

-- ---------------------------------------------------------------------------
-- request_log: rate limiting for the public endpoints
-- ---------------------------------------------------------------------------
create table public.request_log (
    id         bigint generated always as identity primary key,
    kind       text not null check (kind in ('apply', 'upload_url')),
    ip_hash    text not null,
    created_at timestamptz not null default now()
);

create index request_log_ip_idx on public.request_log (ip_hash, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- Applicants never touch the database directly: every insert goes through the
-- serverless API with the service role. The admin UI reads under RLS as the
-- signed-in owner; writes with side effects go through the API too.
-- ---------------------------------------------------------------------------
alter table public.applications    enable row level security;
alter table public.application_log enable row level security;
alter table public.request_log     enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
    select coalesce((select auth.jwt() ->> 'email'), '') = 'dillon@dillon.is'
$$;

create policy "admin reads applications" on public.applications
    for select to authenticated using ((select public.is_admin()));

create policy "admin updates applications" on public.applications
    for update to authenticated
    using ((select public.is_admin()))
    with check ((select public.is_admin()));

create policy "admin reads log" on public.application_log
    for select to authenticated using ((select public.is_admin()));

-- request_log: service role only (no policies)

-- ---------------------------------------------------------------------------
-- Storage: bucket band-media (public read, uploads only via signed upload URLs
-- minted by the service role in /api/apply/upload-url)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('band-media', 'band-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads band media" on storage.objects
    for select to anon, authenticated using (bucket_id = 'band-media');
