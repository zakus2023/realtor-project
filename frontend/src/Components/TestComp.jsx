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
import { addPropertyApi } from "../../utils/api";
import { useAuth0 } from "@auth0/auth0-react";
import UserDetailsContext from "../../context/UserDetailsContext";

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
    (propertyData) => addPropertyApi(propertyData, user?.email, token),
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

  // Handle form submit
  const handleSubmit = async () => {
    if (!formData) {
      console.error("formData is undefined");
      return;
    }

    const payload = new FormData();

    // Append JSON data as a string
    payload.append(
      "data",
      JSON.stringify({
        title: formData.title,
        description: formData.description,
        price: formData.price,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        gpsCode: formData.gpsCode,
        propertyType: formData.propertyType,
        tenureType: formData.tenureType,
        facilities: formData.facilities || [], // Ensure it's an array
        userEmail: user?.email, // Ensure user is defined
        Region: formData.Region, // Ensure Region is included
      })
    );

    // **Ensure images array is defined**
    if (Array.isArray(formData.images)) {
      formData.images.forEach((image) => {
        if (image?.originFileObj) {
          payload.append("files", image.originFileObj);
        }
      });
    } else {
      console.warn("formData.images is undefined or not an array");
    }

    // **Ensure documents array is defined**
    if (Array.isArray(formData.documentations)) {
      // ✅ Correct field name
      formData.documentations.forEach((doc) => {
        // ✅ Correct field name
        if (doc?.originFileObj) {
          payload.append("files", doc.originFileObj);
        }
      });
    } else {
      console.warn("formData.documentations is undefined or not an array"); // ✅ Correct field name
    }

    console.log("Submitting Payload:", Array.from(payload.entries())); // Debugging

    mutate(payload);
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
            beforeUpload={() => false} // Prevent default upload behavior
            style={{ marginBottom: "1rem" }}
          >
            {formData.images.length < 10 && (
              <Button icon={<UploadOutlined />}>Upload Images</Button>
            )}
          </Upload>

          <Upload
            multiple
            fileList={formData.documentations} // ✅ Correct field name
            onChange={(info) => handleFileChange("documentations", info)} // ✅ Correct field name
            beforeUpload={() => false}
            style={{ marginBottom: "1rem" }}
          >
            {formData.documentations.length < 10 && ( // ✅ Correct field name
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


import cloudinary from 'cloudinary'
import {CloudinaryStorage} from 'multer-storage-cloudinary'
import multer from 'multer'


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "properties", // Cloudinary folder name
      allowed_formats: ["jpg", "png", "jpeg", "pdf"],
    },
  });

  const upload = multer({ storage });

export {cloudinary, upload}



export const addProperty = asyncHandler(async (req, res) => {
  upload.array("files", 10)(req, res, async (err) => {
    if (err) {
      return res
        .status(400)
        .json({ message: "File upload failed", error: err });
    }
  });
  if (!req.body.data) {
    return res
      .status(400)
      .json({ message: "Invalid request payload. Expected 'data' object." });
  }

  const {
    title,
    description,
    price,
    Region,
    address,
    city,
    country,
    gpsCode,
    propertyType,
    tenureType,
    facilities,
    userEmail,
  } = req.body.data;

  if (
    !title ||
    !description ||
    !price ||
    !address ||
    !city ||
    !Region ||
    !country ||
    !gpsCode ||
    !propertyType ||
    !tenureType ||
    !userEmail
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const images = req.files
    .filter((file) => file.mimetype.startsWith("image/"))
    .map((file) => file.path);

  const documentations = req.files
    .filter((file) => file.mimetype === "application/pdf")
    .map((file) => file.path);

  if (!Array.isArray(images) || images?.length < 1 || images.length > 10) {
    return res
      .status(400)
      .json({ message: "You must upload between 1 and 10 images." });
  }

  try {
    const residency = await prisma.residency.create({
      data: {
        title,
        description,
        price,
        address,
        city,
        Region,
        country,
        gpsCode,
        propertyType,
        tenureType,
        images,
        documentations,
        facilities,
        owner: { connect: { email: userEmail } },
      },
    });

    res
      .status(201)
      .json({ message: "Property created successfully", residency });
  } catch (error) {
    if (error?.code === "P2002") {
      return res
        .status(400)
        .json({ message: "A property with this address already exists." });
    }
    res
      .status(500)
      .json({ message: "Failed to create property", error: error.message });
  }
});


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
              onChange={({ fileList }) => handleFileChange("images", { fileList })}
              fileList={formData.images}
              style={{ display: "block", marginBottom: "16px" }}
            >
              <Button icon={<UploadOutlined />} style={{ marginTop: "8px" }}>
                Upload Images
              </Button>
            </Upload>


  // Handle file upload change
  const handleFileChange = (name, { fileList }) => {
    const validFiles = fileList.map((file) => {
      // Ensure each file has the required properties
      return {
        ...file,
        uid: file.uid || file.originFileObj?.uid || Date.now(), // Ensure a unique uid
        name: file.name || file.originFileObj?.name || "file", // Ensure a name
        status: file.status || "done", // Ensure a status
        url: file.url || URL.createObjectURL(file.originFileObj || file), // Generate a URL for preview
      };
    });

    setFormData({ ...formData, [name]: validFiles });
  };