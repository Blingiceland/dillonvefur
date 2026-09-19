import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import WhatsOn from './pages/WhatsOn';
import EventPage from './pages/EventPage';
import BookDillon from './pages/BookDillon';
import WhiskyList from './pages/WhiskyList';
import DrinksMenu from './pages/DrinksMenu';
import NotFound from './pages/NotFound';
import Footer from './components/Footer';
import './index.css';

// Client-side navigation keeps the scroll position; reset it on each route change.
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
};

function App() {
    return (
        <Router>
            <ScrollToTop />
            <div className="App">
                <Navbar />
                <main>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/events" element={<WhatsOn />} />
                        <Route path="/events/:slug" element={<EventPage />} />
                        <Route path="/bookdillon" element={<BookDillon />} />
                        <Route path="/whisky" element={<WhiskyList />} />
                        <Route path="/drinks" element={<DrinksMenu />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </main>
                <Footer />
            </div>
            <Analytics />
        </Router>
    );
}

export default App;
