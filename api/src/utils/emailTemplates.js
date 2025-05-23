// api/utils/emailTemplates.js

export { emailWrapper };
const emailWrapper = (content, data) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${data.subject}</title>
  <!--[if mso]>
  <style>
    body { font-family: Arial, sans-serif !important; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f8f9fa">
  <center style="width: 100%; background-color: #f8f9fa">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" style="margin: 0 auto; background: #ffffff">
      <tr>
        <td style="background: #004085; padding: 20px; text-align: center">
          <h1 style="color: #ffffff; margin: 0; font-family: Arial, sans-serif">
            AetherSoft Realtors
          </h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px 20px; font-family: Arial, sans-serif; color: #333333">
          ${content}
          <div style="margin-top: 25px; text-align: center; color: #6c757d; font-size: 0.9em">
            <p>This is an automated notification. Please do not reply directly to this email.</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="background: #004085; padding: 15px; text-align: center; color: #ffffff; font-size: 0.9em">
          <p style="margin: 0">© ${data.currentYear} AetherSoft Realtors. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
`;

// Updated to return the HTML content only
export const getConfirmationEmail = (data) => {
  return emailWrapper(
    `
    <h2 style="color: #004085; margin-top: 0">Booking Confirmation</h2>
    <p>Hello ${data.userName},</p>
    <p>Your booking for <strong>${data.propertyTitle}</strong> has been successfully confirmed.</p>
    <!-- Rest of your template content -->
  `,
    { ...data, subject: "Booking Confirmation" }
  );
};

export const getOwnerNotificationEmail = (data) => {
  return emailWrapper(
    `
    <h2 style="color: #004085; margin-top: 0">New Booking Notification</h2>
    <p>Your property <strong>${data.propertyTitle}</strong> has received a new booking request.</p>
    <!-- Rest of your template content -->
  `,
    { ...data, subject: "New Booking Notification" }
  );
};

// Visit Cancellation
export const getVisitCancellationNotification = (data) =>
  emailWrapper(
    `
  <h2 style="color: #004085; margin-top: 0">Booking Cancellation</h2>
  <p>Hello ${data.userName},</p>
  <p>Your booking for <strong>${data.propertyTitle}</strong> has been cancelled.</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
    <table width="100%" style="margin: 15px 0; border-collapse: collapse">
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Booking Number</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${data.bookingNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Original Date</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${data.date}</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; font-weight: bold">Refund Status</td>
        <td style="padding: 8px">${data.refundStatus}</td>
      </tr>
    </table>
    <div style="text-align: center; margin-top: 20px">
      <a href="${process.env.FRONTEND_URL}/support" 
         style="background: #004085; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 4px; display: inline-block;
                font-weight: bold">
        Contact Support
      </a>
    </div>
  </div>
`,
    { ...data, subject: "Booking Cancellation" }
  );

// Owner Cancellation Notification
export const getOwnerVisitCancellation = (data) =>
  emailWrapper(
    `
  <h2 style="color: #004085; margin-top: 0">Visit Cancellation Notice</h2>
  <p>A booking for your property <strong>${data.propertyTitle}</strong> has been cancelled.</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
    <table width="100%" style="margin: 15px 0; border-collapse: collapse">
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Visitor Name</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${data.userName}</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Original Date</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${data.date}</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; font-weight: bold">Cancellation Reason</td>
        <td style="padding: 8px">User initiated</td>
      </tr>
    </table>
  </div>
`,
    { ...data, subject: "Visit Cancellation Notice" }
  );

// Subscription Notifications
export const getAdminSubscriptionNotification = (data) =>
  emailWrapper(
    `
  <h2 style="color: #004085; margin-top: 0">New Newsletter Subscription</h2>
  <p>A new user has subscribed to your newsletter:</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
    <table width="100%" style="margin: 15px 0; border-collapse: collapse">
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Subscriber Email</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${
          data.email
        }</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; font-weight: bold">Subscription Date</td>
        <td style="padding: 8px">${new Date(
          data.subscriptionDate
        ).toLocaleDateString()}</td>
      </tr>
    </table>
  </div>
`,
    { ...data, subject: "New Newsletter Subscription" }
  );

// Admin Unsubscription Notification (NEW TEMPLATE)
export const getAdminUnsubscriptionNotification = (data) =>
  emailWrapper(
    `
  <h2 style="color: #004085; margin-top: 0">Newsletter Unsubscription</h2>
  <p>A user has unsubscribed from your newsletter:</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
    <table width="100%" style="margin: 15px 0; border-collapse: collapse">
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Subscriber Email</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${
          data.email
        }</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; font-weight: bold">Unsubscription Date</td>
        <td style="padding: 8px">${new Date(
          data.unsubscriptionDate
        ).toLocaleDateString()}</td>
      </tr>
    </table>
  </div>
`,
    { ...data, subject: "Newsletter Unsubscription Notification" }
  );

export const getSubscriptionEmail = (data) =>
  emailWrapper(
    `
  <h2 style="color: #004085; margin-top: 0">Subscription Confirmed</h2>
  <p>Thank you for subscribing to AetherSoft Realtors!</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
    <p>You'll now receive:</p>
    <ul style="margin: 10px 0; padding-left: 20px">
      <li>Property updates</li>
      <li>Market insights</li>
      <li>Exclusive offers</li>
    </ul>
    
    <div style="text-align: center; margin-top: 20px">
      <a href="${process.env.FRONTEND_URL}/listings" 
         style="background: #004085; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 4px; display: inline-block;
                font-weight: bold">
        Browse Properties
      </a>
    </div>
  </div>
`,
    { ...data, subject: "Subscription Confirmed" }
  );

export const getUnsubscriptionEmail = (data) =>
  emailWrapper(
    `
  <h2 style="color: #004085; margin-top: 0">Unsubscription Confirmation</h2>
  <p>We're sorry to see you go!</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
    <p>You have been unsubscribed from our newsletter. You will no longer receive:</p>
    <ul style="margin: 10px 0; padding-left: 20px">
      <li>Property alerts</li>
      <li>Market updates</li>
      <li>Promotional offers</li>
    </ul>
    
    <p style="margin-top: 20px">Changed your mind? You can resubscribe anytime.</p>
    
    <div style="text-align: center; margin-top: 20px">
      <a href="${process.env.FRONTEND_URL}/subscribe" 
         style="background: #004085; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 4px; display: inline-block;
                font-weight: bold">
        Resubscribe
      </a>
    </div>
  </div>
`,
    { ...data, subject: "Unsubscription Confirmation" }
  );

// Property Created - Owner Notification
export const getPropertyCreatedOwnerEmail = (data) =>
  emailWrapper(
    `
  <h2 style="color: #004085; margin-top: 0">Property Submission Received</h2>
  <p>Thank you for submitting your property, <strong>${data.propertyTitle}</strong>!</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
    <table width="100%" style="margin: 15px 0; border-collapse: collapse">
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Submission Date</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${data.submissionDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Property ID</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${data.propertyId}</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; font-weight: bold">Current Status</td>
        <td style="padding: 8px">Under Review</td>
      </tr>
    </table>
    <div style="text-align: center; margin-top: 20px">
      <a href="${data.viewLink}" 
         style="background: #004085; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 4px; display: inline-block;
                font-weight: bold">
        View Your Listing
      </a>
    </div>
  </div>
  <p style="margin-top: 20px">Our team will review your submission and notify you once it's published.</p>
`,
    { ...data, subject: "Property Submission Confirmation" }
  );

// Property Created - Admin Notification
export const getPropertyCreatedAdminEmail = (data) =>
  emailWrapper(
    `
  <h2 style="color: #004085; margin-top: 0">New Property Submission</h2>
  <p>A new property requires administrative review:</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
    <table width="100%" style="margin: 15px 0; border-collapse: collapse">
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Property Title</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${data.propertyTitle}</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Submitted By</td>
        <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${data.ownerEmail}</td>
      </tr>
      <tr>
        <td style="padding: 8px; width: 30%; font-weight: bold">Property ID</td>
        <td style="padding: 8px">${data.propertyId}</td>
      </tr>
    </table>
    <div style="text-align: center; margin-top: 20px">
      <a href="${data.adminLink}" 
         style="background: #004085; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 4px; display: inline-block;
                font-weight: bold">
        Review Property
      </a>
    </div>
  </div>
`,
    { ...data, subject: "New Property Submission Requires Review" }
  );

// Property Published Notification
export const getPropertyPublished = (data) =>
  emailWrapper(
    `
  <h2 style="color: #004085; margin-top: 0">${
    data.subjectPrefix || "Property Update"
  }</h2>
  <div style="border: 1px solid #dee2e6; border-radius: 5px; overflow: hidden; margin: 20px 0">
    <img src="${data.mainImage}" 
         alt="${data.propertyTitle}" 
         style="width: 100%; height: 200px; object-fit: cover">
    <div style="padding: 20px">
      <h3 style="margin: 0 0 15px 0">${data.propertyTitle}</h3>
      <p style="color: #6c757d; margin: 0 0 15px 0">${data.shortDescription}</p>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span style="font-size: 1.2em; font-weight: bold; color: #004085">
          ${data.formattedPrice}
        </span>
        <a href="${data.viewLink}" 
           style="background: #004085; color: white; padding: 8px 16px;
                  text-decoration: none; border-radius: 4px; font-size: 0.9em">
          View Property
        </a>
      </div>
    </div>
  </div>
  ${
    data.unsubscribeLink
      ? `
  <p style="font-size: 0.9em; color: #6c757d; text-align: center">
    <a href="${data.unsubscribeLink}" style="color: #6c757d">Unsubscribe from property alerts</a>
  </p>`
      : ""
  }
`,
    {
      ...data,
      subject: data.emailSubject || "Property Status Update",
      currentYear: new Date().getFullYear(),
    }
  );


// Booking Status Notification Templates

export const generateUserStatusEmail = (data = {}) => {
  const safeData = {
    userName: data.userName || 'Customer',
    bookingId: data.bookingId || 'N/A',
    propertyTitle: data.propertyTitle || 'Unknown Property',
    oldStatus: data.oldStatus || 'unknown',
    newStatus: data.newStatus || 'unknown',
    bookingDate: data.bookingDate || 'Not specified',
    bookingTime: data.bookingTime || 'Not specified',
    supportEmail: data.supportEmail || process.env.SUPPORT_EMAIL || 'support@example.com'
  };

  return emailWrapper(
    `
    <h2 style="color: #004085; margin-top: 0">Booking Status Update</h2>
    <p>Hello ${safeData.userName},</p>
    <p>Your booking status has been updated:</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
      <table width="100%" style="margin: 15px 0; border-collapse: collapse">
        <tr>
          <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Booking ID</td>
          <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${safeData.bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Property</td>
          <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${safeData.propertyTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Previous Status</td>
          <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${safeData.oldStatus}</td>
        </tr>
        <tr>
          <td style="padding: 8px; width: 30%; font-weight: bold">New Status</td>
          <td style="padding: 8px">${safeData.newStatus}</td>
        </tr>
      </table>
      
      <div style="margin-top: 20px">
        <p><strong>Date:</strong> ${safeData.bookingDate}</p>
        <p><strong>Time:</strong> ${safeData.bookingTime}</p>
      </div>
    </div>
    
    <p style="margin-top: 20px">
      If you have any questions about this update, please contact our support team at 
      <a href="mailto:${safeData.supportEmail}">${safeData.supportEmail}</a>.
    </p>
  `,
    { ...safeData, subject: `Booking Status Update - ${safeData.newStatus.toUpperCase()}` }
  );
};

export const generateOwnerStatusEmail = (data = {}) => {
  const safeData = {
    propertyTitle: data.propertyTitle || 'Unknown Property',
    bookingId: data.bookingId || 'N/A',
    userName: data.userName || 'Unknown Visitor',
    oldStatus: data.oldStatus || 'unknown',
    newStatus: data.newStatus || 'unknown',
    bookingDate: data.bookingDate || 'Not specified',
    bookingTime: data.bookingTime || 'Not specified',
    propertyAddress: data.propertyAddress || 'Address not available',
    propertyImage: data.propertyImage || null
  };

  return emailWrapper(
    `
    <h2 style="color: #004085; margin-top: 0">Booking Update Notification</h2>
    <p>A booking for your property has been updated:</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
      <table width="100%" style="margin: 15px 0; border-collapse: collapse">
        <tr>
          <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Booking ID</td>
          <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${safeData.bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Visitor</td>
          <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${safeData.userName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Status Change</td>
          <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${safeData.oldStatus} → ${safeData.newStatus}</td>
        </tr>
      </table>
      
      <div style="margin-top: 20px">
        <p><strong>Scheduled Date:</strong> ${safeData.bookingDate}</p>
        <p><strong>Scheduled Time:</strong> ${safeData.bookingTime}</p>
        <p><strong>Property Address:</strong> ${safeData.propertyAddress}</p>
      </div>
    </div>
  `,
    { ...safeData, subject: `Booking Update for ${safeData.propertyTitle}` }
  );
};

export const generateAdminStatusEmail = (data = {}) => {
  const safeData = {
    bookingId: data.bookingId || 'N/A',
    propertyTitle: data.propertyTitle || 'Unknown Property',
    userName: data.userName || 'Unknown Visitor',
    oldStatus: data.oldStatus || 'unknown',
    newStatus: data.newStatus || 'unknown',
    bookingDate: data.bookingDate || 'Not specified',
    bookingTime: data.bookingTime || 'Not specified',
    propertyAddress: data.propertyAddress || 'Address not available',
    ownerEmail: data.ownerEmail || 'Not specified'
  };

  return emailWrapper(
    `
    <h2 style="color: #004085; margin-top: 0">Admin Alert: Booking Status Changed</h2>
    <p>A booking status has been updated in the system:</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px">
      <table width="100%" style="margin: 15px 0; border-collapse: collapse">
        <tr>
          <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Booking ID</td>
          <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${safeData.bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; width: 30%; border-bottom: 1px solid #dee2e6; font-weight: bold">Status Change</td>
          <td style="padding: 8px; border-bottom: 1px solid #dee2e6">${safeData.oldStatus} → ${safeData.newStatus}</td>
        </tr>
      </table>
      
      <div style="margin-top: 20px">
        <p><strong>Property:</strong> ${safeData.propertyTitle}</p>
        <p><strong>Visitor:</strong> ${safeData.userName}</p>
        <p><strong>Date:</strong> ${safeData.bookingDate}</p>
        <p><strong>Time:</strong> ${safeData.bookingTime}</p>
        <p><strong>Owner Email:</strong> ${safeData.ownerEmail}</p>
      </div>
    </div>
  `,
    { ...safeData, subject: `Admin: Booking ${safeData.bookingId} Status Update` }
  );
};
