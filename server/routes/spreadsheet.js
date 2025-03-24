import express from 'express';
import { google } from 'googleapis';
import { verifyToken } from '../middleware/auth.js';
import { auth } from '../config/googleAuth.js';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { v4 as uuidv4 } from 'uuid';
import XLSX from 'xlsx';

const router = express.Router();

// Store active spreadsheet IDs in memory (or use Redis/database in production)
const activeSpreadsheets = new Map();

// Get active spreadsheet
router.get('/get-active-spreadsheet', verifyToken, async (req, res) => {
  try {
    const activeSpreadsheetId = activeSpreadsheets.get(req.user.email);
    res.json({ success: true, activeSpreadsheetId });
  } catch (error) {
    console.error('Error getting active spreadsheet:', error);
    res.status(500).json({ success: false, message: 'Failed to get active spreadsheet' });
  }
});

// Set active spreadsheet
router.post('/set-active-spreadsheet', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    // Store the active spreadsheet ID for the user
    activeSpreadsheets.set(req.user.email, spreadsheetId);

    // Initialize the spreadsheet with Unique ID column if needed
    await initializeSpreadsheet(spreadsheetId);

    res.json({ success: true, message: 'Active spreadsheet set successfully' });
  } catch (error) {
    console.error('Error setting active spreadsheet:', error);
    res.status(500).json({ success: false, message: 'Failed to set active spreadsheet' });
  }
});

// Initialize spreadsheet with Unique ID column
async function initializeSpreadsheet(spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  try {
    // Get current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const values = response.data.values || [];
    const hasUniqueIdColumn = values[0] && values[0][0] === 'Unique ID';

    if (!hasUniqueIdColumn) {
      // Insert new column at the beginning
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            insertDimension: {
              range: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 1
              }
            }
          }]
        }
      });

      // Add header and sequential IDs
      const newValues = values.map((row, index) => {
        if (index === 0) {
          return ['Unique ID', ...row];
        }
        return [index.toString(), ...row];
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1',
        valueInputOption: 'RAW',
        resource: { values: newValues }
      });
    }
  } catch (error) {
    console.error('Error initializing spreadsheet:', error);
    throw error;
  }
}

// Function to get the next available ID
async function getNextId(spreadsheetId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:A', // Get all values in column A (ID column)
    });

    const values = response.data.values || [];
    if (values.length <= 1) return 1; // If only header exists or empty sheet

    // Filter out header and get numeric IDs
    const ids = values.slice(1)
      .map(row => parseInt(row[0]))
      .filter(id => !isNaN(id));

    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
  } catch (error) {
    console.error('Error getting next ID:', error);
    throw error;
  }
}

async function getAdminSpreadsheetId() {
  const adminData = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.ADMIN_SHEET_ID,
    range: 'Sheet1',
  });
  return adminData.data.values[adminData.data.values.length - 1][7];
}

// Function to ensure Groups sheet exists
async function ensureGroupsSheetExists(sheets, spreadsheetId) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const groupsSheet = spreadsheet.data.sheets.find(
      sheet => sheet.properties.title === 'Groups'
    );

    if (!groupsSheet) {
      // Create Groups sheet if it doesn't exist
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Groups',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 4,
                },
              },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Groups!A1:D1',
        valueInputOption: 'RAW',
        resource: {
          values: [['Group ID', 'Group Name', 'Description', 'Member IDs']],
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error ensuring Groups sheet exists:', error);
    throw error;
  }
}

// Fetch registrations
router.get('/fetch-registrations', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId } = req.query;
    
    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No data found in spreadsheet' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
  }
});

// Create Group
router.post('/create-group', verifyToken, async (req, res) => {
  try {
    const { groupName, description, selectedFields, spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID is required' });
    }

    if (!selectedFields || !Array.isArray(selectedFields) || selectedFields.length === 0) {
      return res.status(400).json({ message: 'Selected members are required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Ensure Groups sheet exists
    await ensureGroupsSheetExists(sheets, spreadsheetId);

    // Generate unique group ID
    const groupId = uuidv4();

    // Get member IDs from selected fields (first column contains the ID)
    const memberIds = selectedFields.map(field => field[0]);

    // Add group to Groups sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Groups!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          groupId,
          groupName,
          description,
          JSON.stringify(memberIds)
        ]],
      },
    });

    res.json({ 
      success: true, 
      groupId,
      message: 'Group created successfully',
      groupDetails: {
        groupId,
        groupName,
        description,
        memberCount: memberIds.length
      }
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group' });
  }
});

// Fetch Groups
router.get('/fetch-groups', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId } = req.query;

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID is required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Ensure Groups sheet exists
    await ensureGroupsSheetExists(sheets, spreadsheetId);

    // Get all groups
    const groupsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Groups!A2:D',
    });

    // Get all users for member details
    const usersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const users = usersResponse.data.values || [];
    const userMap = new Map();
    if (users.length > 1) { // Skip header row
      users.slice(1).forEach(user => {
        userMap.set(user[0], user); // Map user ID to full user data
      });
    }

    const rows = groupsResponse.data.values || [];
    const groups = rows.map(row => {
      const memberIds = JSON.parse(row[3] || '[]');
      const members = memberIds.map(id => {
        const userData = userMap.get(id);
        return userData ? {
          id: userData[0],
          name: `${userData[1]} ${userData[3]}`, // Assuming first and last name columns
          email: userData[4] // Assuming email column
        } : null;
      }).filter(Boolean);

      return {
        groupId: row[0],
        groupName: row[1],
        description: row[2],
        memberIds,
        members,
        memberCount: members.length
      };
    });

    res.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

// Combine Groups
router.post('/combine-groups', verifyToken, async (req, res) => {
  try {
    const { groupIds, newGroupName, description, spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID is required' });
    }

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length < 2) {
      return res.status(400).json({ message: 'At least two groups must be selected' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get existing groups
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Groups!A2:D',
    });

    const rows = response.data.values || [];
    const groups = rows.filter(row => groupIds.includes(row[0]));
    
    // Combine member IDs
    const combinedMemberIds = new Set();
    groups.forEach(group => {
      const memberIds = JSON.parse(group[3] || '[]');
      memberIds.forEach(id => combinedMemberIds.add(id));
    });

    // Generate new group ID
    const newGroupId = uuidv4();

    // Create new combined group
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Groups!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          newGroupId,
          newGroupName,
          description,
          JSON.stringify(Array.from(combinedMemberIds))
        ]],
      },
    });

    res.json({ 
      success: true, 
      groupId: newGroupId,
      message: 'Groups combined successfully',
      groupDetails: {
        groupId: newGroupId,
        groupName: newGroupName,
        description,
        memberCount: combinedMemberIds.size
      }
    });
  } catch (error) {
    console.error('Error combining groups:', error);
    res.status(500).json({ message: 'Failed to combine groups' });
  }
});

// Delete Users
router.delete('/delete-users', verifyToken, async (req, res) => {
  try {
    const { userIds, spreadsheetId } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID is required' });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs are required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get the current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values;
    if (!rows) {
      return res.status(404).json({ message: 'No data found' });
    }

    // Filter out the rows to be deleted
    const updatedRows = rows.filter((row, index) => {
      if (index === 0) return true; // Keep header row
      return !userIds.includes(row[0]); // Remove rows with matching IDs
    });

    // Update the spreadsheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      resource: { values: updatedRows },
    });

    // Update groups to remove deleted users
    const groupsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Groups!A2:D',
    });

    const groupRows = groupsResponse.data.values || [];
    const updatedGroupRows = groupRows.map(row => {
      const memberIds = JSON.parse(row[3] || '[]');
      const filteredMemberIds = memberIds.filter(id => !userIds.includes(id));
      return [row[0], row[1], row[2], JSON.stringify(filteredMemberIds)];
    });

    if (updatedGroupRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Groups!A2:D',
        valueInputOption: 'RAW',
        resource: { values: updatedGroupRows },
      });
    }

    res.json({ 
      success: true, 
      message: 'Users deleted successfully and groups updated',
      deletedCount: userIds.length
    });
  } catch (error) {
    console.error('Error deleting users:', error);
    res.status(500).json({ message: 'Failed to delete users' });
  }
});

// Export PDF
router.get('/export-pdf', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId } = req.query;

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID is required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values || [];

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=data.pdf');
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Data Export', { align: 'center' });
    doc.moveDown();

    // Add timestamp
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Add table headers
    const headers = rows[0] || [];
    const colWidths = headers.map(header => Math.max(header.length * 7, 70));
    let y = doc.y;
    headers.forEach((header, i) => {
      doc.fontSize(12).text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y);
    });

    // Add table data
    doc.fontSize(10);
    rows.slice(1).forEach(row => {
      y = doc.y + 20;
      row.forEach((cell, i) => {
        doc.text(cell.toString(), 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y);
      });
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ message: 'Failed to export PDF' });
  }
});

// Export CSV
router.get('/export-csv', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId } = req.query;

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID is required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values || [];
    
    // Convert to CSV
    const parser = new Parser();
    const csv = parser.parse(rows.slice(1).map(row => {
      const obj = {};
      rows[0].forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=data.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ message: 'Failed to export CSV' });
  }
});

// Export Excel
router.get('/export-excel', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId } = req.query;

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID is required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values || [];

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Add some styling
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "CCCCCC" } } };
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[address]) continue;
      worksheet[address].s = headerStyle;
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ message: 'Failed to export Excel' });
  }
});

export default router;