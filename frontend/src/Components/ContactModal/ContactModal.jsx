import React, { useState } from "react";
import "./ContactModal.css";
import { toast } from "react-toastify";

const ContactModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    to_email: "idbsch2012@gmail.com", // Fixed recipient's email
    from_name: "", // Sender's name
    from_email: "", // Sender's email
    subject: "", // Email subject
    message: "", // Email body
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${VITE_BACKEND_BASE_URL}/api/user/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Email sent successfully!");
        onClose(); // Close the modal after submission
      } else {
        alert("Failed to send the email. Please try again later.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to send the email. Please try again later.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        <h2 style={{ color: "orange" }}>Contact Us</h2>
        <form onSubmit={handleSubmit}>
          {/* Sender's Name */}
          <div className="form-group">
            <label htmlFor="from_name">Your Name</label>
            <input
              type="text"
              id="from_name"
              name="from_name"
              value={formData.from_name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Sender's Email */}
          <div className="form-group">
            <label htmlFor="from_email">Your Email</label>
            <input
              type="email"
              id="from_email"
              name="from_email"
              value={formData.from_email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email Subject */}
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email Body */}
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
            />
          </div>
          <div className="" style={{ display: "flex", gap: "1rem" }}>
            <button
              type="button"
              className="cancel-button"
              onClick={() => onClose()}
            >
              Cancel
            </button>

            <button type="submit" className="submit-button">
              Send Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;
