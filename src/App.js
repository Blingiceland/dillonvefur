import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import WhatsOn from './pages/WhatsOn';
import Whiskeys from './pages/Whiskeys';
import Merch from './pages/Merch';
import BookDillon from './pages/BookDillon';
import WhiskyList from './pages/WhiskyList';
import DrinksMenu from './pages/DrinksMenu';
import Footer from './components/Footer';
import './index.css';
import tabIcon from './assets/tab-icon.png';

function App() {
    useEffect(() => {
        // Dynamically set the favicon
        const link = document.querySelector("link[rel~='icon']");
        if (link) {
            link.href = tabIcon;
        } else {
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = tabIcon;
            document.head.appendChild(newLink);
        }

        // Set page title
        document.title = 'Dillon';
    }, []);

    return (
        <Router>
            <div className="App">
                <Navbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/events" element={<WhatsOn />} />
                    <Route path="/whiskeys" element={<Whiskeys />} />
                    <Route path="/merch" element={<Merch />} />
                    <Route path="/bookdillon" element={<BookDillon />} />
                    <Route path="/whisky" element={<WhiskyList />} />
                    <Route path="/drinks" element={<DrinksMenu />} />
                </Routes>

                <Footer />
                <Analytics />
            </div>
        </Router>
    );
}

export default App;
