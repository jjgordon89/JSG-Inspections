import React, { useEffect, useRef } from 'react';
import './Modal.css';

function Modal({ children, onClose }) {
  const modalRef = useRef();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleFocusTrap = (event) => {
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements;
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    modalRef.current.addEventListener('keydown', handleFocusTrap);

    // Set focus to the first focusable element in the modal
    const firstFocusableElement = modalRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusableElement) {
      firstFocusableElement.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (modalRef.current) {
        modalRef.current.removeEventListener('keydown', handleFocusTrap);
      }
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default Modal;