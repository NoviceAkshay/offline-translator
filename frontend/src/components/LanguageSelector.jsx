import React, { useState, useRef, useEffect } from 'react';
import '../index.css';

const LanguageSelector = ({ languages, selectedCode, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredLanguages = languages.filter(lang =>
        lang.name.toLowerCase().includes(search.toLowerCase()) ||
        lang.code.toLowerCase().includes(search.toLowerCase())
    );

    const selectedLang = languages.find(l => l.code === selectedCode);

    return (
        <div className="custom-select-wrapper" ref={wrapperRef}>
            <div
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedLang ? selectedLang.name : 'Select Language'}</span>
                <span className="arrow">▼</span>
            </div>

            {isOpen && (
                <div className="custom-options-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search language..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="options-list">
                        {filteredLanguages.map(lang => (
                            <div
                                key={lang.code}
                                className={`custom-option ${lang.code === selectedCode ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(lang.code);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                            >
                                {lang.name}
                                {lang.code === selectedCode && <span className="check">✓</span>}
                            </div>
                        ))}
                        {filteredLanguages.length === 0 && (
                            <div className="no-options">No matches found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
