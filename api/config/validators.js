// utils/validators.js
import dayjs from 'dayjs';

/**
 * Validates a phone number based on the provider's format
 * @param {string} phone - The phone number to validate
 * @param {string} provider - The mobile provider (mtn, airteltigo, vodafone, glo)
 * @returns {boolean} - True if valid, false otherwise
 */
export const validatePhoneNumber = (phone, provider) => {
  if (!phone || !provider) return false;

  // Remove all non-digit characters
  const cleanedPhone = phone.replace(/\D/g, '');

  // Ghana phone number validation
  if (provider.toLowerCase() === 'mtn') {
    // MTN Ghana numbers start with 24, 54, 55, 59, 27, 57, 26, 56, 20, 50
    return /^(24|54|55|59|27|57|26|56|20|50)\d{7}$/.test(cleanedPhone);
  }

  if (provider.toLowerCase() === 'airteltigo') {
    // AirtelTigo numbers start with 27, 57, 26, 56
    return /^(27|57|26|56)\d{7}$/.test(cleanedPhone);
  }

  if (provider.toLowerCase() === 'vodafone') {
    // Vodafone Ghana numbers start with 20, 50
    return /^(20|50)\d{7}$/.test(cleanedPhone);
  }

  if (provider.toLowerCase() === 'glo') {
    // Glo numbers start with 23, 53, 24, 54
    return /^(23|53|24|54)\d{7}$/.test(cleanedPhone);
  }

  // Default validation for other providers (10 digits)
  return /^\d{10}$/.test(cleanedPhone);
};

/**
 * Validates a date string in DD/MM/YYYY format
 * @param {string} dateString - The date string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateDate = (dateString) => {
  return dayjs(dateString, "DD/MM/YYYY", true).isValid();
};

/**
 * Validates a time string in HH:mm format
 * @param {string} timeString - The time string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateTime = (timeString) => {
  return dayjs(timeString, "HH:mm", true).isValid();
};

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Validates a payment reference ID based on payment method
 * @param {string} reference - The payment reference
 * @param {string} method - The payment method
 * @returns {boolean} - True if valid, false otherwise
 */
export const validatePaymentReference = (reference, method) => {
  if (!reference) return false;

  switch (method) {
    case 'stripe':
      return reference.startsWith('pi_') && reference.length > 10;
    case 'paypal':
      return reference.length === 17 && /^[A-Z0-9]+$/.test(reference);
    case 'paystack':
    case 'mobile_money':
      return reference.length >= 10 && /^[a-zA-Z0-9]+$/.test(reference);
    default:
      return true; // For pay_on_arrival which doesn't need reference
  }
};

/**
 * Validates a property ID
 * @param {string} id - The property ID to validate
 * @returns {boolean} - True if valid MongoDB ID, false otherwise
 */
export const validatePropertyId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export default {
  validatePhoneNumber,
  validateDate,
  validateTime,
  validateEmail,
  validatePaymentReference,
  validatePropertyId
};