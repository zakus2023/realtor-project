import {
  Button,
  Modal,
  Steps,
  Form,
  Input,
  DatePicker,
  Select,
  Upload,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import React, { useState } from "react";

const { Step } = Steps;
const { Option } = Select;

function CreateListing({ opened, setOpened }) {
  const [currentStep, setCurrentStep] = useState(0); // Track the current step
  const [form] = Form.useForm(); // Form instance

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
            <Input placeholder="Enter listing title" />
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
              { required: true, message: "Please enter a Ghana Post GPS Cde" },
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
            rules={[{ required: true, message: "Please select a tenure type!" }]}
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
              { required: true, message: "Please upload at least one image!" },
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
              <Button icon={<UploadOutlined />}>Upload Images</Button>
            </Upload>
          </Form.Item>

          {/* Upload PDFs */}
          <Form.Item
            name="pdfs"
            label="Upload PDFs"
            rules={[
              { required: true, message: "Please upload at least one PDF!" },
            ]}
            valuePropName="fileList"
            getValueFromEvent={(e) => e.fileList}
          >
            <Upload
              multiple
              beforeUpload={(file) => {
                const isPDF = file.type === "application/pdf";
                if (!isPDF) {
                  message.error("You can only upload PDF files!");
                }
                return isPDF || Upload.LIST_IGNORE;
              }}
            >
              <Button icon={<UploadOutlined />}>Upload PDFs</Button>
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
    <Modal
      open={opened}
      onCancel={() => setOpened(false)}
      title="Create Listing"
      width="90%"
      footer={[
        <Button key="cancel" onClick={() => setOpened(false)}>
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
            Submit
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

      {/* Form Content */}
      <Form form={form} layout="vertical">
        {steps[currentStep].content}
      </Form>
    </Modal>
  );
}

export default CreateListing;
