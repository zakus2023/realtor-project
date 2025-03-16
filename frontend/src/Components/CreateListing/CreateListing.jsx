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
import { Spin } from "antd";

const { Step } = Steps;
const { Option } = Select;

function CreateListing({ opened, setOpened }) {
  const { user } = useAuth0();
  const { userDetails } = useContext(UserDetailsContext);
  const token = userDetails.token;

  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false); // For file uploads
  const [submitting, setSubmitting] = useState(false); // For form submission

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    address: "",
    city: "",
    Region: "",
    country: "",
    gpsCode: "",
    propertyStatus: "available",
    status: "review",
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
      [name]: [...fileList], // Ensure fileList is updated correctly
    }));
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // Check if the current step's fields are filled
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          formData.title.trim() !== "" &&
          formData.description.trim() !== "" &&
          formData.price.trim() !== ""
        );
      case 1: // Address and Location
        return (
          formData.address.trim() !== "" &&
          formData.Region.trim() !== "" &&
          formData.city.trim() !== "" &&
          formData.country.trim() !== ""
        );
      case 2: // Facilities
        return (
          formData.facilities.beds > 0 &&
          formData.facilities.baths > 0 &&
          formData.facilities.kitchen > 0
        );
      case 3: // Other Information
        return formData.propertyType !== "" && formData.tenureType !== "";
      case 4: // Upload Files
        return formData.images.length > 0 && formData.documentations.length > 0;
      default:
        return false;
    }
  };

  // Check if all fields in the form are filled
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

  // Mutation for adding property
  const { mutate, isLoading } = useMutation(
    ({ payload, email, token }) =>
      addPropertyApiCallFunction({ payload, email, token }),
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
          propertyStatus: "available",
          status: "review",
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

  // Handle form submit
  const handleSubmit = async () => {
    if (!formData) {
      console.error("formData is undefined");
      return;
    }

    try {
      setUploading(true); // Start loading

      // Construct the payload
      const payload = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        address: formData.address,
        city: formData.city,
        Region: formData.Region,
        country: formData.country,
        gpsCode: formData.gpsCode,
        propertyStatus: formData.propertyStatus,
        status: formData.status,
        propertyType: formData.propertyType,
        tenureType: formData.tenureType,
        facilities: formData.facilities,
        images: formData.images,
        documentations: formData.documentations,
        imagesCount: formData.images.length, // Number of image files
      };

      // Call the API function using useMutation
      mutate({ payload, email: user?.email, token });
    } catch (error) {
      setUploading(false);
      setSubmitting(false);
      console.error("Error uploading files or submitting form:", error);
      message.error("Failed to upload files or submit form.");
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
          {uploading && (
            <Spin
              size="large"
              style={{ display: "block", marginBottom: "1rem" }}
            />
          )}
          <Upload
            listType="picture-card"
            multiple
            fileList={formData.images}
            onChange={(info) => handleFileChange("images", info)}
            beforeUpload={() => false} // Prevent default upload behavior
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
          >
            {formData.documentations.length < 10 && (
              <Button icon={<UploadOutlined />}>Upload Files (PDFs)</Button>
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
            disabled={!isCurrentStepValid()}
          >
            Next
          </Button>
        ) : (
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmit}
            disabled={!isFormValid()}
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
