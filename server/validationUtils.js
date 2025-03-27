// validationUtils.js
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRegex = /^\d{10}$/;
const validGenders = ['male', 'female', 'other'];

const validateEmail = (email) => {
  return emailRegex.test(email);
};

const validateMobile = (mobile) => {
  return mobileRegex.test(mobile);
};

const validateGender = (gender) => {
  return validGenders.includes(gender.toLowerCase());
};

module.exports = {
  validateEmail,
  validateMobile,
  validateGender
};