import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendSecurityCode = async (email, code, isAdmin = false) => {
  const subject = isAdmin ? 'Admin Registration Security Code' : 'User Registration Security Code';
  const text = `Your security code is: ${code}. Please use this code to complete your registration.`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendPasswordResetCode = async (email, code) => {
  const subject = 'Password Reset Code';
  const text = `Your password reset code is: ${code}. Please use this code to reset your password.`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};