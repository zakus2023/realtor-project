import { UploadOutlined } from "@ant-design/icons";
import {
  Button,
  Input,
  Modal,
  Select,
  Steps,
  Upload,
  InputNumber,
  message,
} from "antd";
import "antd/dist/reset.css";
import React, { useContext, useState } from "react";
import "./CreateListing.css";
import { useMutation } from "react-query";
import { useAuth0 } from "@auth0/auth0-react";
import UserDetailsContext from "../../context/UserDetailsContext";
import { addPropertyApiCallFunction } from "../../utils/api";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from '../../utils/firebase';

const { Step } = Steps;
const { Option } = Select;

function CreateListing({ opened, setOpened }) {
  const { user } = useAuth0();
  const { userDetails } = useContext(UserDetailsContext);
  const token = userDetails.token;

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    address: "",
    city: "",
    Region: "",
    country: "",
    gpsCode: "",
    propertyType: "",
    tenureType: "",
    images: [],
    documentations: [],
    facilities: {
      beds: 1,
      baths: 1,
      kitchen: 1,
      parking: 0,
    },
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNumberChange = (field, value) => {
    setFormData({
      ...formData,
      facilities: { ...formData.facilities, [field]: value },
    });
  };

  const handleFileChange = (name, { fileList }) => {
    setFormData((prev) => ({
      ...prev,
      [name]: [...fileList],
    }));
  };

  const handleNext = () => {
    if (isCurrentStepValid()) {
      setCurrentStep(currentStep + 1);
    } else {
      message.error("Please fill out all required fields before proceeding.");
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 0:
        return (
          formData.title.trim() !== "" &&
          formData.description.trim() !== "" &&
          formData.price.trim() !== ""
        );
      case 1:
        return (
          formData.address.trim() !== "" &&
          formData.Region.trim() !== "" &&
          formData.city.trim() !== "" &&
          formData.country.trim() !== ""
        );
      case 2:
        return (
          formData.facilities.beds > 0 &&
          formData.facilities.baths > 0 &&
          formData.facilities.kitchen > 0
        );
      case 3:
        return formData.propertyType !== "" && formData.tenureType !== "";
      case 4:
        return formData.images.length > 0 && formData.documentations.length > 0;
      default:
        return false;
    }
  };

  const isFormValid = () => {
    return (
      formData.title.trim() !== "" &&
      formData.description.trim() !== "" &&
      formData.price.trim() !== "" &&
      formData.address.trim() !== "" &&
      formData.city.trim() !== "" &&
      formData.Region.trim() !== "" &&
      formData.country.trim() !== "" &&
      formData.propertyType !== "" &&
      formData.tenureType !== "" &&
      formData.images.length > 0 &&
      formData.documentations.length > 0
    );
  };

  const { mutate, isLoading } = useMutation(
    (payload) => addPropertyApiCallFunction({ payload, email: user?.email, token }),
    {
      onSuccess: () => {
        message.success("Property added successfully!");
        setOpened(false);
        setFormData({
          title: "",
          description: "",
          price: "",
          address: "",
          city: "",
          Region: "",
          country: "",
          gpsCode: "",
          propertyType: "",
          tenureType: "",
          images: [],
          documentations: [],
          facilities: {
            beds: 1,
            baths: 1,
            kitchen: 1,
            parking: 0,
          },
        });
      },
      onError: (error) => {
        message.error(`Failed to add property: ${error.message}`);
      },
    }
  );

  const handleSubmit = async () => {
    if (!isFormValid()) {
      message.error("Please fill out all required fields.");
      return;
    }

    setLoading(true);

    try {
      const imageUrls = await Promise.all(
        formData.images.map(async (image) => {
          const storageRef = ref(storage, `images/${image.name}`);
          await uploadBytes(storageRef, image.originFileObj);
          return getDownloadURL(storageRef);
        })
      );

      const documentationUrls = await Promise.all(
        formData.documentations.map(async (doc) => {
          const storageRef = ref(storage, `documents/${doc.name}`);
          await uploadBytes(storageRef, doc.originFileObj);
          return getDownloadURL(storageRef);
        })
      );

      const payload = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        gpsCode: formData.gpsCode,
        propertyType: formData.propertyType,
        tenureType: formData.tenureType,
        facilities: formData.facilities,
        userEmail: user?.email,
        Region: formData.Region,
        images: imageUrls,
        documentations: documentationUrls,
      };

      mutate(payload);
    } catch (error) {
      console.error("Error uploading files or submitting form:", error);
      message.error("Failed to upload files or submit form.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "Basic Information",
      content: (
        <>
          <Input
            name="title"
            placeholder="Title"
            value={formData.title}
            onChange={handleChange}
            style={{ marginBottom: "1rem" }}
          />
          <Input.TextArea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            style={{ marginBottom: "1rem" }}
          />
          <Input
            type="number"
            name="price"
            placeholder="Price"
            value={formData.price}
            onChange={handleChange}
            style={{ marginBottom: "1rem" }}
          />
        </>
      ),
    },
    {
      title: "Address and Location",
      content: (
        <>
          <Input
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            style={{ marginBottom: "1rem" }}
          />
          <Input
            name="city"
            placeholder="City"
            value={formData.city}
            onChange={handleChange}
            style={{ marginBottom: "1rem" }}
          />
          <Input
            name="Region"
            placeholder="Region"
            value={formData.Region}
            onChange={handleChange}
            style={{ marginBottom: "1rem" }}
          />
          <Input
            name="country"
            placeholder="Country"
            value={formData.country}
            onChange={handleChange}
            style={{ marginBottom: "1rem" }}
          />
          <Input
            name="gpsCode"
            placeholder="GPS Code"
            value={formData.gpsCode}
            onChange={handleChange}
            style={{ marginBottom: "1rem" }}
          />
        </>
      ),
    },
    {
      title: "Facilities",
      content: (
        <>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Beds:
          </label>
          <InputNumber
            min={1}
            max={20}
            value={formData.facilities.beds}
            onChange={(value) => handleNumberChange("beds", value)}
            style={{ marginBottom: "1rem" }}
          />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Baths:
          </label>
          <InputNumber
            min={1}
            max={20}
            value={formData.facilities.baths}
            onChange={(value) => handleNumberChange("baths", value)}
            style={{ marginBottom: "1rem" }}
          />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Kitchen:
          </label>
          <InputNumber
            min={1}
            max={10}
            value={formData.facilities.kitchen}
            onChange={(value) => handleNumberChange("kitchen", value)}
            style={{ marginBottom: "1rem" }}
          />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Parking:
          </label>
          <InputNumber
            min={0}
            max={10}
            value={formData.facilities.parking}
            onChange={(value) => handleNumberChange("parking", value)}
            style={{ marginBottom: "1rem" }}
          />
        </>
      ),
    },
    {
      title: "Listing Type",
      content: (
        <>
          <Select
            value={formData.propertyType}
            onChange={(value) =>
              setFormData({ ...formData, propertyType: value })
            }
            style={{ marginBottom: "1rem", width: "100%" }}
          >
            <Option value="house">House</Option>
            <Option value="room">Room</Option>
            <Option value="apartment">Apartment</Option>
            <Option value="store">Store</Option>
            <Option value="office">Office</Option>
            <Option value="land">Plot</Option>
          </Select>
          <Select
            value={formData.tenureType}
            onChange={(value) =>
              setFormData({ ...formData, tenureType: value })
            }
            style={{ marginBottom: "1rem", width: "100%" }}
          >
            <Option value="rent">Rent</Option>
            <Option value="sale">Sale</Option>
          </Select>
        </>
      ),
    },
    {
      title: "Upload Files",
      content: (
        <>
          <Upload
            listType="picture-card"
            multiple
            fileList={formData.images}
            onChange={(info) => handleFileChange("images", info)}
            beforeUpload={() => false}
            style={{ marginBottom: "1rem" }}
          >
            {formData.images.length < 10 && (
              <Button icon={<UploadOutlined />}>Upload Images</Button>
            )}
          </Upload>

          <Upload
            multiple
            fileList={formData.documentations}
            onChange={(info) => handleFileChange("documentations", info)}
            beforeUpload={() => false}
            style={{ marginBottom: "1rem" }}
          >
            {formData.documentations.length < 10 && (
              <Button icon={<UploadOutlined />}>
                Upload Files (Images/PDFs)
              </Button>
            )}
          </Upload>
        </>
      ),
    },
  ];

  return (
    <Modal
      open={opened}
      onCancel={() => setOpened(false)}
      title="Create Listing"
      width="60%"
      centered
      footer={[
        <Button key="cancel" onClick={() => setOpened(false)}>
          Cancel
        </Button>,
        currentStep > 0 && (
          <Button key="prev" onClick={handlePrev} disabled={currentStep === 0}>
            Previous
          </Button>
        ),
        currentStep < steps.length - 1 ? (
          <Button
            key="next"
            type="primary"
            onClick={handleNext}
            disabled={!isCurrentStepValid() || loading}
          >
            Next
          </Button>
        ) : (
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmit}
            disabled={!isFormValid() || loading}
            loading={loading}
          >
            Add Property
          </Button>
        ),
      ]}
      style={{ padding: ".5rem" }}
    >
      <Steps current={currentStep} style={{ marginBottom: "1rem" }}>
        {steps.map((step) => (
          <Step key={step.title} title={step.title} />
        ))}
      </Steps>
      {steps[currentStep].content}
    </Modal>
  );
}

export default CreateListing;



// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANqbAgg7WW3GzitRJj_HzOVZlBP_RAR3k",
  authDomain: "aether-soft-realtor.firebaseapp.com",
  projectId: "aether-soft-realtor",
  storageBucket: "aether-soft-realtor.firebasestorage.app",
  messagingSenderId: "1003426378616",
  appId: "1:1003426378616:web:18555703f7bd756d27ce8d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { storage };


// rules_version = '2';
// service firebase.storage {
//   match /b/{bucket}/o {
//     match /{allPaths=**} {
//       allow read, write: if request.resource.size < 10 * 1024 * 1024
//                          && request.resource.contentType.matches('image/.*|application/pdf');
//     }
//   }
// }


import React, { useContext, useState } from "react";
import "./GetStarted.css";
import UserDetailsContext from "../../context/UserDetailsContext";
import { useAuth0 } from "@auth0/auth0-react";

function GetStarted() {
  const { userDetails } = useContext(UserDetailsContext);
  const token = userDetails?.token;
  const { user } = useAuth0();

  const email = user?.email;

  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Send the email to your backend
      const response = await fetch("http://localhost:5000/api/user/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubscribed(true);
        setError("");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to subscribe. Please try again later.");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("An error occurred. Please try again later.");
    }
  };

  return (
    <section className="g-wrapper">
      <div className="paddings innerWidth g-container">
        <div className="flexColCenter inner-container">
          <span className="primaryText">
            Get Started with AetherSoft Realtors
          </span>
          <span className="secondaryText">
            Subscribe and find super attractive price quotes from us <br /> Find
            your dream property now
          </span>

          {subscribed ? (
            <p className="success-message">Thank you for subscribing!</p>
          ) : (
            <form onSubmit={handleSubmit} className="subscription-form">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="button">
                Subscribe
              </button>
            </form>
          )}

          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    </section>
  );
}




