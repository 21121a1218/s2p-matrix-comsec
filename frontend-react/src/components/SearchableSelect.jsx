import React, { useState, useEffect, useRef } from 'react';

export default function SearchableSelect({ 
  options = [], // { value, label }
  value, 
  onChange, 
  placeholder = "Select an option...", 
  searchPlaceholder = "Type to search..." 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="ss-wrapper" ref={wrapperRef}>
      <div 
        className={`ss-trigger ${isOpen ? 'ss-active' : ''} ${value ? 'ss-has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="ss-trigger-text">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className="fa fa-chevron-down ss-arrow"></i>
      </div>

      <div className={`ss-panel ${isOpen ? 'ss-open' : ''}`}>
        <div className="ss-search-box">
          <i className="fa fa-search" style={{ color: '#94a3b8', fontSize: '13px' }}></i>
          <input 
            type="text" 
            ref={searchInputRef}
            className="ss-search-input" 
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="ss-list">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <div 
                key={opt.value}
                className={`ss-option ${opt.value === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="ss-no-results">No matches found</div>
          )}
        </div>
      </div>
    </div>
  );
}
