import { UploadOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Select, Steps, Upload, Form } from "antd";
import React, { useState } from "react";
import "./CreateListing.css"; // Import the CSS file

const { Step } = Steps;
const { Option } = Select;

function CreateListing({ opened, setOpened }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  // Steps content
  const steps = [
    {
      title: "Basic Information",
      content: (
        <>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Please enter a title!" }]}
          >
            <Input placeholder="Please Enter title" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter a description!" }]}
          >
            <Input.TextArea placeholder="Enter listing description" rows={4} />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price"
            rules={[{ required: true, message: "Please enter a price!" }]}
          >
            <Input type="number" placeholder="Enter listing price" />
          </Form.Item>
        </>
      ),
    },
    {
      title: "Address and Location",
      content: (
        <>
          <Form.Item
            name="address"
            label="Address"
            rules={[{ required: true, message: "Please enter an Address!" }]}
          >
            <Input placeholder="Enter listing location/address" />
          </Form.Item>
          <Form.Item
            name="city"
            label="City"
            rules={[{ required: true, message: "Please enter a city!" }]}
          >
            <Input placeholder="Enter listing City" />
          </Form.Item>
          <Form.Item
            name="country"
            label="Country"
            rules={[{ required: true, message: "Please enter a Country!" }]}
          >
            <Input placeholder="Enter listing Country" />
          </Form.Item>
          <Form.Item
            name="gpsCode"
            label="GPS CODE"
            rules={[
              { required: true, message: "Please enter a Ghana Post GPS Code" },
            ]}
          >
            <Input placeholder="Enter listing Ghana Post GPS Code" />
          </Form.Item>
        </>
      ),
    },
    {
      title: "Other Information",
      content: (
        <>
          <Form.Item
            name="propertyType"
            label="Property Type"
            rules={[{ required: true, message: "Please select a type!" }]}
          >
            <Select placeholder="Select property type">
              <Option value="house">House</Option>
              <Option value="room">Room</Option>
              <Option value="apartment">Apartment</Option>
              <Option value="land">Plot</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="tenureType"
            label="Tenure Type"
            rules={[
              { required: true, message: "Please select a tenure type!" },
            ]}
          >
            <Select placeholder="Select tenure type">
              <Option value="rent">Rent</Option>
              <Option value="sale">Sale</Option>
            </Select>
          </Form.Item>
        </>
      ),
    },
    {
      title: "Upload Files",
      content: (
        <>
          {/* Upload Images */}
          <Form.Item
            name="images"
            label="Upload Images"
            rules={[
              {
                required: true,
                message:
                  "Please upload at least one image and max (10 images)!",
              },
            ]}
            valuePropName="fileList"
            getValueFromEvent={(e) => e.fileList}
          >
            <Upload
              listType="picture-card"
              multiple
              beforeUpload={(file) => {
                const isImage = file.type.startsWith("image/");
                if (!isImage) {
                  message.error("You can only upload image files!");
                }
                return isImage || Upload.LIST_IGNORE;
              }}
            >
              <Button
                icon={<UploadOutlined />}
                style={{ marginTop: "10rem", marginLeft: "3.5rem" }}
              >
                Upload Images
              </Button>
            </Upload>
          </Form.Item>

          {/* Upload Documents */}
          <Form.Item
            name="documents"
            label="Upload property documents (Images or PDFs)"
            rules={[
              {
                required: true,
                message:
                  "Please upload at least one file or (max of 10 files)!",
              },
            ]}
            valuePropName="fileList"
            getValueFromEvent={(e) => e.fileList}
            style={{ marginTop: "4rem" }}
          >
            <Upload
              multiple
              beforeUpload={(file) => {
                const isImage = file.type.startsWith("image/");
                const isPDF = file.type === "application/pdf";

                if (!isImage && !isPDF) {
                  message.error("You can only upload image or PDF files!");
                  return Upload.LIST_IGNORE; // Ignore invalid files
                }

                return true; // Accept valid files
              }}
            >
              <Button icon={<UploadOutlined />}>Upload Files</Button>
            </Upload>
          </Form.Item>
        </>
      ),
    },
  ];

  // Handle next step
  const handleNext = () => {
    form
      .validateFields()
      .then(() => {
        setCurrentStep(currentStep + 1);
      })
      .catch((err) => {
        console.log("Validation failed:", err);
      });
  };

  // Handle previous step
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // Handle form submission
  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        console.log("Form Values:", values); // Replace with your API call or logic
        setOpened(false); // Close the modal
        form.resetFields(); // Reset the form fields
      })
      .catch((err) => {
        console.log("Validation failed:", err);
      });
  };

  return (
    <>
      <Modal
        open={opened}
        onCancel={() => setOpened(false)}
        title="Create Listing"
        width={"70%"}
        footer={[
          <Button
            key="key"
            type="primary"
            style={{ background: "red" }}
            onClick={() => setOpened(false)}
          >
            Cancel
          </Button>,
          currentStep > 0 && (
            <Button key="prev" onClick={handlePrev}>
              Previous
            </Button>
          ),
          currentStep < steps.length - 1 ? (
            <Button key="next" type="primary" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button key="submit" type="primary" onClick={handleSubmit}>
              Add Property
            </Button>
          ),
        ]}
        centered
      >
        {/* Stepper */}
        <Steps current={currentStep} style={{ marginBottom: "24px" }}>
          {steps.map((step) => (
            <Step key={step.title} title={step.title} />
          ))}
        </Steps>
        {/* Form content */}
        <Form form={form} layout="vertical">
          {steps[currentStep].content}
        </Form>
      </Modal>
    </>
  );
}

export default CreateListing;
