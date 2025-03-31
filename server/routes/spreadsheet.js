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

// Fetch registrations with case-insensitive Unique ID check
router.get('/fetch-registrations', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId } = req.query;

    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // First, check if Unique ID column exists (case-insensitive)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A1:Z1', // Get just the header row
    });

    const headerRow = response.data.values?.[0] || [];
    const hasUniqueIdColumn = headerRow.length > 0 &&
      headerRow[0].trim().toLowerCase() === 'unique id';

    if (!hasUniqueIdColumn) {
      // If no Unique ID column, initialize the spreadsheet
      await initializeSpreadsheetWithUniqueId(sheets, spreadsheetId, headerRow);
    }

    // Now fetch the full data
    const fullResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = fullResponse.data.values || [];

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No data found in spreadsheet' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
  }
});

// Helper function to initialize spreadsheet with Unique ID column
async function initializeSpreadsheetWithUniqueId(sheets, spreadsheetId, existingHeaderRow = []) {
  try {
    // Get current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const values = response.data.values || [];

    // Check if we need to insert a new column or just rename existing first column
    const firstColHeader = values[0]?.[0] || '';
    const isFirstColumnEmpty = !firstColHeader.trim();

    if (isFirstColumnEmpty) {
      // If first column is empty, just rename it
      values[0][0] = 'Unique ID';
    } else {
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
    }

    // Prepare new data with Unique ID column
    const newValues = values.map((row, index) => {
      if (index === 0) {
        // For header row
        if (isFirstColumnEmpty) {
          return row; // We already updated the first cell
        }
        return ['Unique ID', ...row]; // Add header
      }

      // For data rows
      if (isFirstColumnEmpty) {
        row[0] = index.toString(); // Fill empty first column with ID
        return row;
      }
      return [index.toString(), ...row]; // Add sequential IDs
    });

    // Update the sheet with new data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      resource: { values: newValues }
    });
  } catch (error) {
    console.error('Error initializing spreadsheet with Unique ID:', error);
    throw error;
  }
}
// Create Group
router.post('/create-group', verifyToken, async (req, res) => {
  try {
    const { groupName, description, selectedFields, spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID is required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Check if Groups sheet exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    let groupsSheetId = null;

    const groupsSheet = spreadsheet.data.sheets.find(
      sheet => sheet.properties.title === 'Groups'
    );

    if (!groupsSheet) {
      // Create Groups sheet if it doesn't exist
      const addSheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Groups',
              },
            },
          }],
        },
      });

      groupsSheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;

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

    // Generate unique group ID
    const groupId = uuidv4();

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
          JSON.stringify(selectedFields.map(field => field[0]))
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
        memberCount: selectedFields.length
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

// Delete Users - Fixed version
router.delete('/delete-users', verifyToken, async (req, res) => {
  try {
    const { userIds, spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'User IDs are required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get the current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No data found' });
    }

    // Filter out the rows to be deleted (keep header row)
    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    const updatedRows = dataRows.filter(row => !userIds.includes(row[0]));

    // First clear the entire sheet (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Sheet1!A2:Z',
    });

    // Then write back the filtered data
    if (updatedRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A2', // Start from row 2 (below header)
        valueInputOption: 'RAW',
        resource: {
          values: updatedRows
        }
      });
    }

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
      // Clear groups data first
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Groups!A2:D',
      });

      // Then write back updated groups
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Groups!A2',
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
    res.status(500).json({ success: false, message: 'Failed to delete users' });
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

// Update Row
router.put('/update-row', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId, rowData, rowIndex } = req.body;

    if (!spreadsheetId || !rowData || rowIndex === undefined) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A${rowIndex + 2}`,
      valueInputOption: 'RAW',
      resource: {
        values: [rowData]
      }
    });

    res.json({
      success: true,
      message: 'Row updated successfully',
      updatedData: rowData
    });
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).json({ message: 'Failed to update row' });
  }
});

// Add User
// router.post('/add-user', verifyToken, async (req, res) => {
//   try {
//     const { userData, spreadsheetId } = req.body;

//     if (!spreadsheetId) {
//       return res.status(400).json({ message: 'Spreadsheet ID is required' });
//     }

//     const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

//     // Generate unique ID
//     const uniqueId = uuidv4();

//     // Prepare user data array with unique ID
//     const userDataArray = [uniqueId, ...Object.values(userData)];

//     // Add user to spreadsheet
//     await sheets.spreadsheets.values.append({
//       spreadsheetId,
//       range: 'Sheet1',
//       valueInputOption: 'RAW',
//       resource: {
//         values: [userDataArray],
//       },
//     });

//     res.json({ success: true, uniqueId });
//   } catch (error) {
//     console.error('Error adding user:', error);
//     res.status(500).json({ message: 'Failed to add user' });
//   }
// });

router.post('/init-spreadsheet', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Missing spreadsheet ID' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Fetch existing data from the spreadsheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:Z', // Fetch all columns
    });

    let values = response.data.values || [];

    // Check if the first column is already "Unique ID"
    if (values.length > 0 && values[0][0] === 'Unique ID') {
      return res.json({ success: true, message: 'Unique ID already exists' });
    }

    // Shift existing columns to the right by adding "Unique ID" at column A
    const updatedValues = values.map((row, index) => {
      if (index === 0) {
        return ['Unique ID', ...row]; // Add header at the beginning
      }
      return [index, ...row]; // Add sequential Unique IDs
    });

    // Update the entire sheet with the shifted data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: { values: updatedValues },
    });

    res.json({ success: true, message: 'Spreadsheet initialized with Unique ID column' });
  } catch (error) {
    console.error('Error initializing spreadsheet:', error);
    res.status(500).json({ message: 'Failed to initialize spreadsheet' });
  }
});

// Add this to your backend routes
router.delete('/delete-spreadsheet', verifyToken, async (req, res) => {
  try {
    const { email, spreadsheetId } = req.body;

    if (!email || !spreadsheetId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userSpreadsheetId = req.cookies.spreadsheetId;
    if (!userSpreadsheetId) {
      return res.status(400).json({ error: 'No spreadsheet ID found. Please login again.' });
    }

    // Get all spreadsheets from the "Spreadsheet IDs" sheet
    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: userSpreadsheetId,
      range: 'Spreadsheet IDs!A:D',
    });

    const rows = response.data.values || [];
    const updatedRows = rows.filter(row => row[2] !== spreadsheetId);

    // Clear the existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId: userSpreadsheetId,
      range: 'Spreadsheet IDs',
    });

    // Write back the filtered data (excluding the deleted spreadsheet)
    if (updatedRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: userSpreadsheetId,
        range: 'Spreadsheet IDs!A1',
        valueInputOption: 'RAW',
        resource: { values: updatedRows },
      });
    }

    // Remove from active spreadsheets if it's the current one
    if (activeSpreadsheets.get(email) === spreadsheetId) {
      activeSpreadsheets.delete(email);
    }

    res.json({
      success: true,
      message: 'Spreadsheet deleted successfully',
    });
  } catch (error) {
    console.error('Delete spreadsheet error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete spreadsheet' });
  }
});

router.delete('/delete-groups', verifyToken, async (req, res) => {
  try {
    const { groupIds, spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Group IDs are required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get all groups from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Groups!A2:D',
    });

    const rows = response.data.values || [];

    // Filter out the groups to be deleted
    const updatedRows = rows.filter(row => !groupIds.includes(row[0]));

    // Clear the existing groups data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Groups!A2:D',
    });

    // Write back the filtered groups (excluding deleted ones)
    if (updatedRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Groups!A2',
        valueInputOption: 'RAW',
        resource: { values: updatedRows },
      });
    }

    res.json({
      success: true,
      message: 'Groups deleted successfully',
      deletedCount: groupIds.length
    });
  } catch (error) {
    console.error('Error deleting groups:', error);
    res.status(500).json({ success: false, message: 'Failed to delete groups' });
  }
});

// Add this to your backend routes (messageCenter.js)
router.put('/update-row', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId, rowData, rowIndex } = req.body;

    if (!spreadsheetId || !rowData || rowIndex === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Update the row in the spreadsheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A${rowIndex + 2}:Z${rowIndex + 2}`, // +2 because header is row 1 and JS is 0-indexed
      valueInputOption: 'RAW',
      resource: {
        values: [rowData]
      }
    });

    res.json({
      success: true,
      message: 'Row updated successfully',
      updatedData: rowData
    });
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).json({ success: false, message: 'Failed to update row' });
  }
});

// Add Users to Groups
router.post('/add-users-to-groups', verifyToken, async (req, res) => {
  try {
    const { userIds, groupIds, spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'User IDs are required' });
    }

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Group IDs are required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get all groups
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Groups!A2:D',
    });

    const rows = response.data.values || [];
    let updatedCount = 0;

    // Update each selected group
    const updatedRows = rows.map(row => {
      if (groupIds.includes(row[0])) {
        const memberIds = JSON.parse(row[3] || '[]');
        const newMemberIds = [...new Set([...memberIds, ...userIds])]; // Merge and dedupe
        updatedCount++;
        return [row[0], row[1], row[2], JSON.stringify(newMemberIds)];
      }
      return row;
    });

    // Update the groups sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Groups!A2:D',
      valueInputOption: 'RAW',
      resource: { values: updatedRows },
    });

    res.json({
      success: true,
      message: `Users added to ${updatedCount} group(s)`,
      updatedGroupCount: updatedCount,
      addedUserCount: userIds.length
    });
  } catch (error) {
    console.error('Error adding users to groups:', error);
    res.status(500).json({ success: false, message: 'Failed to add users to groups' });
  }
});

// Remove Users from Groups
router.post('/remove-users-from-groups', verifyToken, async (req, res) => {
  try {
    const { userIds, groupIds, spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'User IDs are required' });
    }

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Group IDs are required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get all groups
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Groups!A2:D',
    });

    const rows = response.data.values || [];
    let updatedCount = 0;

    // Update each selected group
    const updatedRows = rows.map(row => {
      if (groupIds.includes(row[0])) {
        const memberIds = JSON.parse(row[3] || '[]');
        // Filter out the users we want to remove
        const newMemberIds = memberIds.filter(id => !userIds.includes(id));
        updatedCount++;
        return [row[0], row[1], row[2], JSON.stringify(newMemberIds)];
      }
      return row;
    });

    // Update the groups sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Groups!A2:D',
      valueInputOption: 'RAW',
      resource: { values: updatedRows },
    });

    res.json({
      success: true,
      message: `Users removed from ${updatedCount} group(s)`,
      updatedGroupCount: updatedCount,
      removedUserCount: userIds.length
    });
  } catch (error) {
    console.error('Error removing users from groups:', error);
    res.status(500).json({ success: false, message: 'Failed to remove users from groups' });
  }
});

// Get next available ID
router.get('/get-next-id', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId } = req.query;
    
    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get all values from the ID column (column A)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:A', // Skip header row
    });

    const values = response.data.values || [];
    const ids = values.map(row => parseInt(row[0])).filter(id => !isNaN(id));

    const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;

    res.json({ 
      success: true,
      nextId
    });
  } catch (error) {
    console.error('Error getting next ID:', error);
    res.status(500).json({ success: false, message: 'Failed to get next ID' });
  }
});

// Import Data
router.post('/import-data', verifyToken, async (req, res) => {
  try {
    const { spreadsheetId, data } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Data is required' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get headers to determine column order
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!1:1', // Get header row
    });

    const headers = headersResponse.data.values?.[0] || [];
    if (headers.length === 0) {
      return res.status(400).json({ success: false, message: 'No headers found in spreadsheet' });
    }

    // Prepare data in correct column order
    const values = data.map(item => {
      return headers.map(header => item[header] || '');
    });

    // Append data to spreadsheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      resource: {
        values
      }
    });

    res.json({ 
      success: true,
      importedCount: data.length
    });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ success: false, message: 'Failed to import data' });
  }
});

export default router;