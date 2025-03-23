// utils/emailTemplates.js
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compileTemplate = async (templateName, data) => {
  try {
    const templatePath = path.join(
      __dirname,
      "../templates/emails",
      `${templateName}.html`
    );
    let html = await readFile(templatePath, "utf-8");

    const defaults = {
      mainImage: 'https://via.placeholder.com/600x400',
      shortDescription: 'Property description not available',
      unsubscribeLink: '#',
      currentYear: new Date().getFullYear(),
      formattedPrice: 'Price Upon Request'
    };

    return html.replace(/\${(.*?)}/g, (match, p1) => {
      const key = p1.trim();
      return data[key] || defaults[key] || '';
    });
  } catch (error) {
    console.error(`Template compilation error (${templateName}):`, error);
    return ''; // Return empty string to prevent email sending failures
  }
};

export const getConfirmationEmail = (data) =>
  compileTemplate("visitConfirmation", {
    ...data,
    year: new Date().getFullYear(),
  });

export const getOwnerNotificationEmail = (data) =>
  compileTemplate("ownerNotification", {
    ...data,
    year: new Date().getFullYear(),
  });

export const getVisitCancellationNotification = (data) =>
  compileTemplate("visitCancelConfirmation", {
    ...data,
    year: new Date().getFullYear(),
  });

export const getOwnerVisitCancellation = (data) =>
  compileTemplate("ownerVisitCancelNotification", {
    ...data,
    year: new Date().getFullYear(),
  });

// for subsription and unsubscription
export const getSubscriptionEmail = (data) =>
  compileTemplate("subscriptionConfirmation", {
    ...data,
    year: new Date().getFullYear(),
  });

export const getUnsubscriptionEmail = (data) =>
  compileTemplate("unsubscriptionConfirmation", {
    ...data,
    year: new Date().getFullYear(),
    resubscribeLink: "https://yourdomain.com/subscribe", // Add actual resubscribe link
  });

export const getAdminSubscriptionNotification = (data) =>
  compileTemplate("adminSubscriptionNotification", {
    ...data,
    year: new Date().getFullYear(),
  });

  // property created edited

  // Property-related Templates
  export const getPropertyCreatedOwnerEmail = (data) =>
    compileTemplate("propertyCreatedOwner", {
      propertyTitle: data.propertyTitle || "Your Property",
      propertyId: data.propertyId || "N/A",
      submissionDate: data.submissionDate || new Date().toLocaleDateString(),
      viewLink: data.viewLink || "#",
      currentYear: new Date().getFullYear()
    });

    export const getPropertyCreatedAdminEmail = (data) =>
      compileTemplate("propertyCreatedAdmin", {
        propertyTitle: data.propertyTitle || "New Property Listing",
        ownerEmail: data.ownerEmail || "Unknown Submitter",
        propertyId: data.propertyId || "N/A",
        adminLink: data.adminLink || "#",
        currentYear: new Date().getFullYear()
      });
    
    export const getPropertyPublished = (data) =>
      compileTemplate("propertyPublished", {
        mainImage: data.mainImage || 'https://via.placeholder.com/600x400',
        propertyTitle: data.propertyTitle || "New Property Listing",
        shortDescription: data.shortDescription || "Check out our latest property listing",
        formattedPrice: data.formattedPrice || "Price Upon Request",
        viewLink: data.viewLink || "#",
        unsubscribeLink: data.unsubscribeLink || "#",
        currentYear: new Date().getFullYear()
      });