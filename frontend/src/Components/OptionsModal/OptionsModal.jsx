import React from "react";
import "./OptionsModal.css"; // Add CSS for the modal

const OptionsModal = ({ options, onSelect, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        <h2>Choose an Option</h2>
        <div className="options-list">
          {options.map((option, index) => (
            <div
              key={index}
              className="option"
              onClick={() => onSelect(option)}
            >
              {option.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OptionsModal;