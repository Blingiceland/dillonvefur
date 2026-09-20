-- Request-changes flow and sound engineer question
alter type public.application_status add value if not exists 'changes_requested' after 'submitted';

alter table public.applications
    add column if not exists needs_sound_engineer text check (needs_sound_engineer in ('yes', 'no')),
    add column if not exists edit_token text unique,
    add column if not exists resubmitted_at timestamptz;

comment on column public.applications.edit_token is 'Secret in the link the band uses to update its application after "request changes"';
