// In addProperty function:

// Send email to owner with AWAITED template
const ownerEmailContent = await getPropertyCreatedOwnerEmail({
  propertyTitle: title,
  propertyId: residency.id,
  submissionDate: new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }),
  viewLink: `http://localhost:5173/listing/${residency.id}`
});

await sendEmail(
  owner.email,
  "Property Submission Confirmation", 
  ownerEmailContent // Now resolved HTML string
);

// Send to admins with AWAITED template
const adminEmailContent = await getPropertyCreatedAdminEmail({
  propertyTitle: title,
  ownerEmail: owner.email,
  propertyId: residency.id,
  adminLink: `http://your-admin-dashboard-url/listings/${residency.id}`
});

const adminEmailPromises = adminEmails.map(async (adminEmail) => 
  await sendEmail(
    adminEmail,
    "New Property Submission Requires Review",
    adminEmailContent // Resolved HTML string
  )
);


// In editProperty function:

// When sending status emails
const statusEmailContent = await getPropertyStatusEmail({
  ...commonEmailData,
  statusChangeMessage: statusChangedToPublished
    ? "Your property listing is now live!"
    : "Your property listing has been unpublished"
});

// For subscriber emails
const publishedEmailContent = await getPropertyPublishedEmail({
  mainImage: updatedResidency.images[0] || 'https://via.placeholder.com/600x400',
  propertyTitle: title,
  shortDescription: description.length > 100 
    ? `${description.substring(0, 97)}...` 
    : description,
  formattedPrice: `$${parseFloat(price).toFixed(2)}`,
  viewLink: `http://localhost:5173/listing/${id}`
});