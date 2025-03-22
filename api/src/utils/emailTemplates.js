// utils/emailTemplates.js
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compileTemplate = async (templateName, data) => {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
    let html = await readFile(templatePath, 'utf-8');
  
    // Handle dynamic content
    return html.replace(/\${(.*?)}/g, (match, p1) => {
      return data[p1.trim()] || match;
    });
};

export const getConfirmationEmail = (data) => compileTemplate('visitConfirmation', {
  ...data,
  year: new Date().getFullYear()
});

export const getOwnerNotificationEmail = (data) => compileTemplate('ownerNotification', {
  ...data,
  year: new Date().getFullYear()
});

export const getVisitCancellationNotification = (data) => compileTemplate('visitCancelConfirmation', {
  ...data,
  year: new Date().getFullYear()
});

export const getOwnerVisitCancellation = (data) => compileTemplate('ownerVisitCancelNotification', {
  ...data,
  year: new Date().getFullYear()
});

// for subsription and unsubscription
export const getSubscriptionEmail = (data) => compileTemplate('subscriptionConfirmation', {
  ...data,
  year: new Date().getFullYear()
});

export const getUnsubscriptionEmail = (data) => compileTemplate('unsubscriptionConfirmation', {
  ...data,
  year: new Date().getFullYear(),
  resubscribeLink: 'https://yourdomain.com/subscribe' // Add actual resubscribe link
});

export const getAdminSubscriptionNotification = (data) => compileTemplate('adminSubscriptionNotification', {
  ...data,
  year: new Date().getFullYear()
});