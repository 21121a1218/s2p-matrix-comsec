import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, iconClass, children, maxWidth = "600px" }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-premium open" onMouseDown={onClose}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div
        className="modal modal-content-premium"
        style={{ maxWidth, width: '100%', padding: 0, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header — fixed, never scrolls */}
        <div className="modal-header" style={{ background: '#f8fafc', padding: '20px 24px', borderRadius: '20px 20px 0 0', borderBottom: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {iconClass && (
              <div style={{ width: '40px', height: '40px', background: '#eff6ff', color: '#3b82f6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                <i className={iconClass}></i>
              </div>
            )}
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{title}</h2>
          </div>
          <button className="modal-close" onClick={onClose} style={{ background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: '18px', flexShrink: 0 }}>
            &times;
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
