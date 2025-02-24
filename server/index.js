import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendSecurityCode, sendPasswordResetCode } from './emailService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 3001;

// Get the directory name using ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Google Sheets API setup
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'credentials.json'),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// Function to share spreadsheet and set permissions
async function shareSpreadsheet(spreadsheetId) {
  try {
    const serviceAccountEmail = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'credentials.json'))
    ).client_email;

    // Grant editor access
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: serviceAccountEmail,
      },
    });

    return true;
  } catch (error) {
    console.error('Error sharing spreadsheet:', error.message);
    throw new Error('Failed to share spreadsheet');
  }
}

const pendingRegistrations = new Map(); // Temporary storage for unverified users
const idCounters = new Map(); // Counters for sequential IDs

async function ensureHeaders(spreadsheetId, isAdmin) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    if (!response.data.values || response.data.values.length === 0) {
      // Add headers if not present
      const headers = isAdmin
        ? ['Unique ID', 'First Name', 'Middle Name', 'Surname', 'Mobile', 'Email', 'Gender', 'Spreadsheet ID', 'Password', 'Security Code']
        : ['Unique ID', 'First Name', 'Middle Name', 'Surname', 'Mobile', 'Email', 'Gender', 'Password', 'Security Code'];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        resource: { values: [headers] },
      });

      // Initialize ID counter for the new spreadsheet
      idCounters.set(spreadsheetId, 1);
    } else {
      // Initialize ID counter based on existing data
      const maxId = Math.max(...response.data.values.map(row => parseInt(row[0]) || 0));
      idCounters.set(spreadsheetId, maxId + 1);
    }
  } catch (error) {
    console.error('Error ensuring headers:', error);
  }
}

// Function to ensure Spreadsheet IDs sheet exists
async function ensureSpreadsheetIdsSheet(spreadsheetId) {
  try {
    // Try to get the Spreadsheet IDs sheet
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Spreadsheet IDs!A1',
    });
  } catch (error) {
    // Create the sheet if it doesn't exist
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Spreadsheet IDs',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 4,
                },
              },
            },
          },
        ],
      },
    });

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Spreadsheet IDs!A1:D1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Unique ID', 'User Email', 'Spreadsheet ID', 'Spreadsheet Name']],
      },
    });
  }
}

// Function to get next available ID for Spreadsheet IDs sheet
async function getNextSpreadsheetId(spreadsheetId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Spreadsheet IDs!A:A',
    });

    const values = response.data.values || [];
    if (values.length <= 1) return 1; // If only header exists

    const ids = values.slice(1).map(row => parseInt(row[0])).filter(id => !isNaN(id));
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
  } catch (error) {
    console.error('Error getting next spreadsheet ID:', error);
    throw error;
  }
}

const extractSpreadsheetId = (url) => {
  const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return matches ? matches[1] : null;
};

app.post('/api/register/admin', async (req, res) => {
  try {
    const { firstName, middleName, surname, mobile, email, gender, spreadsheetUrl, password } = req.body;

    // Extract the spreadsheet ID from the URL
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Invalid Google Spreadsheet URL' });
    }

    // Share the spreadsheet with the service account
    await shareSpreadsheet(spreadsheetId);

    // Ensure headers in admin sheet
    await ensureHeaders(process.env.ADMIN_SHEET_ID, true);

    const securityCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const uniqueId = idCounters.get(process.env.ADMIN_SHEET_ID); // Get the next sequential ID

    // Store user details temporarily
    pendingRegistrations.set(email, { uniqueId, firstName, middleName, surname, mobile, email, gender, spreadsheetId, hashedPassword, securityCode, isAdmin: true });

    await sendSecurityCode(email, securityCode, true);
    res.json({ success: true, message: 'Security code sent. Please verify to complete registration.' });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

app.post('/api/register/user', async (req, res) => {
  try {
    const { firstName, middleName, surname, mobile, email, gender, password } = req.body;

    const securityCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminData = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.ADMIN_SHEET_ID,
      range: 'Sheet1',
    });

    const userSpreadsheetId = adminData.data.values[adminData.data.values.length - 1][7];

    await ensureHeaders(userSpreadsheetId, false); // Ensure headers in user sheet

    const uniqueId = idCounters.get(userSpreadsheetId); // Get the next sequential ID

    // Store user details temporarily
    pendingRegistrations.set(email, { uniqueId, firstName, middleName, surname, mobile, email, gender, userSpreadsheetId, hashedPassword, securityCode, isAdmin: false });

    await sendSecurityCode(email, securityCode, false);
    res.json({ success: true, message: 'Security code sent. Please verify to complete registration.' });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

app.post('/api/verify-code', async (req, res) => {
  try {
    const { code, email, isAdmin, purpose } = req.body;
    console.log('Verification request received:', { code, email, isAdmin, purpose });

    if (purpose === 'registration') {
      if (!pendingRegistrations.has(email)) {
        return res.status(400).json({ message: 'No pending registration found for this email.' });
      }

      const userData = pendingRegistrations.get(email);
      console.log('User data from pending registrations:', userData);

      if (isAdmin) {
        if (userData.securityCode !== code) {
          return res.status(400).json({ message: 'Invalid security code' });
        }

        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.ADMIN_SHEET_ID,
          range: 'Sheet1',
          valueInputOption: 'RAW',
          resource: {
            values: [[
              userData.uniqueId,
              userData.firstName,
              userData.middleName,
              userData.surname,
              userData.mobile,
              userData.email,
              userData.gender,
              userData.spreadsheetId,
              userData.hashedPassword,
              userData.securityCode
            ]],
          },
        });

        idCounters.set(process.env.ADMIN_SHEET_ID, userData.uniqueId + 1);

        pendingRegistrations.delete(email);
        return res.json({ success: true, message: 'Admin verification successful. Registration completed.' });
      } else {
        const adminData = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.ADMIN_SHEET_ID,
          range: 'Sheet1',
        });

        const adminRows = adminData.data.values;
        let assignedSpreadsheetId = null;
        let assignedSecurityCode = null;

        for (let i = 1; i < adminRows.length; i++) {
          if (adminRows[i][9] === code) {
            assignedSpreadsheetId = adminRows[i][7];
            assignedSecurityCode = adminRows[i][9];
            break;
          }
        }

        if (!assignedSpreadsheetId) {
          return res.status(400).json({ message: 'Invalid security code' });
        }

        await ensureSpreadsheetIdsSheet(assignedSpreadsheetId);

        await sheets.spreadsheets.values.append({
          spreadsheetId: assignedSpreadsheetId,
          range: 'Sheet1',
          valueInputOption: 'RAW',
          resource: {
            values: [[
              userData.uniqueId,
              userData.firstName,
              userData.middleName,
              userData.surname,
              userData.mobile,
              userData.email,
              userData.gender,
              userData.hashedPassword,
              assignedSecurityCode
            ]],
          },
        });

        idCounters.set(assignedSpreadsheetId, userData.uniqueId + 1);

        pendingRegistrations.delete(email);
        return res.json({ success: true, message: 'User verification successful. Registration completed.' });
      }
    } else if (purpose === 'login') {
      if (isAdmin) {
        const adminData = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.ADMIN_SHEET_ID,
          range: 'Sheet1',
        });

        const adminRows = adminData.data.values;
        const userRow = adminRows.find(row => row[5] === email && row[9] === code);

        if (!userRow) {
          return res.status(400).json({ message: 'Invalid email or security code' });
        }

        const passwordMatch = await bcrypt.compare(req.body.password, userRow[8]);
        if (!passwordMatch) {
          return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ email, isAdmin }, process.env.JWT_SECRET);
        res.cookie('spreadsheetId', userRow[7], { httpOnly: true });
        return res.json({ 
          success: true, 
          message: 'Admin login successful.',
          token,
          spreadsheetId: userRow[7]
        });
      } else {
        const adminData = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.ADMIN_SHEET_ID,
          range: 'Sheet1',
        });

        const adminRows = adminData.data.values;
        let assignedSpreadsheetId = null;
        let assignedSecurityCode = null;

        for (let i = 1; i < adminRows.length; i++) {
          if (adminRows[i][9] === code) {
            assignedSpreadsheetId = adminRows[i][7];
            assignedSecurityCode = adminRows[i][9];
            break;
          }
        }

        if (!assignedSpreadsheetId) {
          return res.status(400).json({ message: 'Invalid security code' });
        }

        await ensureSpreadsheetIdsSheet(assignedSpreadsheetId);

        const userData = await sheets.spreadsheets.values.get({
          spreadsheetId: assignedSpreadsheetId,
          range: 'Sheet1',
        });

        const userRow = userData.data.values.find(row => row[5] === email && row[8] === assignedSecurityCode);

        if (!userRow) {
          return res.status(400).json({ message: 'Invalid email or security code' });
        }

        const passwordMatch = await bcrypt.compare(req.body.password, userRow[7]);
        if (!passwordMatch) {
          return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ email, isAdmin }, process.env.JWT_SECRET);
        res.cookie('spreadsheetId', assignedSpreadsheetId, { httpOnly: true });
        return res.json({ 
          success: true, 
          message: 'User login successful.',
          token,
          spreadsheetId: assignedSpreadsheetId
        });
      }
    } else {
      return res.status(400).json({ message: 'Invalid purpose' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email, isAdmin } = req.body;

    const spreadsheetId = isAdmin ? process.env.ADMIN_SHEET_ID : await getAdminSpreadsheetId();
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const userRow = data.data.values.find(row => row[5] === email);
    if (!userRow) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Update reset code in sheet
    const rowIndex = data.data.values.findIndex(row => row[5] === email);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!J${rowIndex + 1}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[resetCode]],
      },
    });

    // Send reset code via email
    await sendPasswordResetCode(email, resetCode);

    res.json({ success: true, message: 'Password reset code sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, isAdmin } = req.body;

    const spreadsheetId = isAdmin ? process.env.ADMIN_SHEET_ID : await getAdminSpreadsheetId();
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const userRow = data.data.values.find(row => row[5] === email);
    if (!userRow || userRow[9] !== code) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const rowIndex = data.data.values.findIndex(row => row[5] === email);

    // Update password in sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!I${rowIndex + 1}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[hashedPassword]],
      },
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;

    const spreadsheetId = isAdmin ? process.env.ADMIN_SHEET_ID : await getAdminSpreadsheetId();
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const userRow = data.data.values.find(row => row[5] === email);
    if (!userRow) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (isAdmin) {
      // Admin login
      const securityCode = req.body.securityCode;
      if (userRow[9] !== securityCode) {
        return res.status(401).json({ message: 'Invalid security code' });
      }

      const passwordMatch = await bcrypt.compare(password, userRow[8]);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      const token = jwt.sign({ email, isAdmin }, process.env.JWT_SECRET);
      res.cookie('spreadsheetId', userRow[7], { httpOnly: true });
      return res.json({ success: true, token });
    } else {
      // User login
      // First, check the security code in ADMIN_SHEET_ID
      const adminData = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.ADMIN_SHEET_ID,
        range: 'Sheet1',
      });

      const adminRow = adminData.data.values.find(row => row[9] === req.body.securityCode);
      if (!adminRow) {
        return res.status(401).json({ message: 'Invalid security code' });
      }

      // Get the corresponding spreadsheet ID
      const userSpreadsheetId = adminRow[7];

      // Check the username, password, and security code in the user's spreadsheet
      const userData = await sheets.spreadsheets.values.get({
        spreadsheetId: userSpreadsheetId,
        range: 'Sheet1',
      });

      const userDetailRow = userData.data.values.find(row => row[5] === email && row[8] === password && row[9] === req.body.securityCode);
      if (!userDetailRow) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ email, isAdmin }, process.env.JWT_SECRET);
      res.cookie('spreadsheetId', userSpreadsheetId, { httpOnly: true });
      return res.json({ success: true, token });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/spreadsheet-setup', async (req, res) => {
  try {
    const { email, spreadsheetUrl, spreadsheetName } = req.body;
    const newSpreadsheetId = extractSpreadsheetId(spreadsheetUrl);

    if (!newSpreadsheetId) {
      return res.status(400).json({ error: 'Invalid Google Spreadsheet URL' });
    }

    // Get the user's assigned spreadsheet ID from cookies
    const userSpreadsheetId = req.cookies.spreadsheetId;
    if (!userSpreadsheetId) {
      return res.status(400).json({ error: 'No spreadsheet ID found. Please login again.' });
    }

    // Share the new spreadsheet with the service account
    await shareSpreadsheet(newSpreadsheetId);

    // Get next available ID for the spreadsheet entry
    const nextId = await getNextSpreadsheetId(userSpreadsheetId);

    // Add the spreadsheet ID and name to the "Spreadsheet IDs" sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: userSpreadsheetId,
      range: 'Spreadsheet IDs',
      valueInputOption: 'RAW',
      resource: {
        values: [[nextId, email, newSpreadsheetId, spreadsheetName]],
      },
    });

    res.json({ 
      success: true, 
      message: `Spreadsheet "${spreadsheetName}" has been added successfully.` 
    });
  } catch (error) {
    console.error('Spreadsheet setup error:', error);
    res.status(500).json({ error: error.message || 'Spreadsheet setup failed' });
  }
});

app.get('/api/spreadsheet-list', async (req, res) => {
  try {
    const { email } = req.query;
    const userSpreadsheetId = req.cookies.spreadsheetId;

    if (!userSpreadsheetId) {
      return res.status(400).json({ error: 'No spreadsheet ID found. Please login again.' });
    }

    // Get spreadsheet list from the correct spreadsheet
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: userSpreadsheetId,
      range: 'Spreadsheet IDs',
    });

    const spreadsheetList = data.data.values
      ? data.data.values
          .slice(1) // Skip header row
          .filter(row => row[1] === email)
          .map(row => ({
            id: row[2], // Spreadsheet ID
            name: row[3], // Spreadsheet Name
          }))
      : [];

    res.json({ success: true, spreadsheetList });
  } catch (error) {
    console.error('Spreadsheet list error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve spreadsheet list' });
  }
});

async function getAdminSpreadsheetId() {
  const adminData = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.ADMIN_SHEET_ID,
    range: 'Sheet1',
  });
  return adminData.data.values[adminData.data.values.length - 1][7];
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});