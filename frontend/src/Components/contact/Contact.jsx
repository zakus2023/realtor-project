import React, { useState } from "react";
import "./Contact.css";
import { MdCall } from "react-icons/md";
import { BsChatDotsFill } from "react-icons/bs";
import { HiChatBubbleBottomCenter } from "react-icons/hi2";
import OptionsModal from "../OptionsModal/OptionsModal"; // Import the OptionsModal

function Contact() {
  const [activeMode, setActiveMode] = useState(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);

  // Define options for each functionality
  const chatOptions = [
    { label: "WhatsApp", action: () => window.open("https://wa.me/16476192144", "_blank") },
    { label: "Facebook Messenger", action: () => window.open("https://m.me/@Zak Iss", "_blank") },
    { label: "Telegram", action: () => window.open("https://t.me/AetherRealtors", "_blank") },
  ];

  const videoCallOptions = [
    { label: "Google Meet", action: () => window.open("https://meet.google.com/new", "_blank") },
    { label: "Zoom", action: () => window.open("https://zoom.us/", "_blank") },
    { label: "WhatsApp Video Call", action: () => window.open("https://wa.me/16476192144", "_blank") },
  ];
  const messageOptions = [
    { label: "Email", action: () => window.open("mailto:idbsch2012@gmail.com", "_blank") },
    { label: "SMS", action: () => window.open("sms:+16476192144", "_blank") },
  ];

  // Event handlers for each mode
  const handleCall = () => {
    setActiveMode("call");
    window.location.href = "tel:+16476192144";
  };

  const handleChat = () => {
    setActiveMode("chat");
    setCurrentOptions(chatOptions);
    setIsOptionsModalOpen(true);
  };

  const handleVideoCall = () => {
    setActiveMode("videoCall");
    setCurrentOptions(videoCallOptions);
    setIsOptionsModalOpen(true);
  };

  const handleMessage = () => {
    setActiveMode("message");
    setCurrentOptions(messageOptions);
    setIsOptionsModalOpen(true);
  };

  // Handle option selection
  const handleOptionSelect = (option) => {
    option.action(); // Perform the action associated with the option
    setIsOptionsModalOpen(false); // Close the modal
  };

  return (
    <section className="c-wrapper">
      <div className="paddings innerWidth flexCenter c-container">
        {/* left-side */}
        <div className="flexColStart c-left">
          <span className="orangeText">Our Contacts</span>
          <span className="primaryText">Easy to contact us</span>
          <span className="secondaryText">
            We are always ready to help you by providing the best service to our
            clients. We believe that a good place to live can make your life
            better
          </span>
          <div className="flexColStart contactModes">
            {/* first Row */}
            <div className="flexStart row">
              <div className="flexColCenter mode">
                <div className="flexStart">
                  <div className="flexCenter icon">
                    <MdCall size={25} />
                  </div>
                  <div className="flexColStart description">
                    <span className="primaryText">Call</span>
                    <span className="secondaryText">1 055 028 7057</span>
                  </div>
                </div>
                <div
                  className={`flexCenter button ${
                    activeMode === "call" ? "active" : ""
                  }`}
                  onClick={handleCall}
                >
                  Call Now
                </div>
              </div>
              <div className="flexColCenter mode">
                <div className="flexStart">
                  <div className="flexCenter icon">
                    <BsChatDotsFill size={25} />
                  </div>
                  <div className="flexColStart description">
                    <span className="primaryText">Chat</span>
                    <span className="secondaryText">1 055 028 7057</span>
                  </div>
                </div>
                <div
                  className={`flexCenter button ${
                    activeMode === "chat" ? "active" : ""
                  }`}
                  onClick={handleChat}
                >
                  Chat Now
                </div>
              </div>
            </div>
            {/* second row */}
            <div className="flexStart row">
              <div className="flexColCenter mode">
                <div className="flexStart">
                  <div className="flexCenter icon">
                    <MdCall size={25} />
                  </div>
                  <div className="flexColStart description">
                    <span className="primaryText">Video Call</span>
                    <span className="secondaryText">1 055 028 7057</span>
                  </div>
                </div>
                <div
                  className={`flexCenter button ${
                    activeMode === "videoCall" ? "active" : ""
                  }`}
                  onClick={handleVideoCall}
                >
                  Video Call Now
                </div>
              </div>
              <div className="flexColCenter mode">
                <div className="flexStart">
                  <div className="flexCenter icon">
                    <HiChatBubbleBottomCenter size={25} />
                  </div>
                  <div className="flexColStart description">
                    <span className="primaryText">Message</span>
                    <span className="secondaryText">1 055 028 7057</span>
                  </div>
                </div>
                <div
                  className={`flexCenter button ${
                    activeMode === "message" ? "active" : ""
                  }`}
                  onClick={handleMessage}
                >
                  Message Now
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* right-side */}
        <div className="flexColCenter c-right">
          <div className="image-container">
            <img src="./contact.jpg" alt="" />
          </div>
        </div>
      </div>

      {/* Options Modal */}
      {isOptionsModalOpen && (
        <OptionsModal
          options={currentOptions}
          onSelect={handleOptionSelect}
          onClose={() => setIsOptionsModalOpen(false)}
        />
      )}
    </section>
  );
}

export default Contact;