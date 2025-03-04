import express from 'express';
import { google } from 'googleapis';
import { verifyToken } from '../middleware/auth.js';
import { auth } from '../config/googleAuth.js';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';

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

  // Get current headers
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!1:1',
  });

  const headers = response.data.values?.[0] || [];
  
  // Check if Unique ID column exists
  if (!headers.some(header => header.toLowerCase().includes('unique'))) {
    // Get all data
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const allData = dataResponse.data.values || [];
    
    // Prepare new data with Unique ID column
    const newData = allData.map((row, index) => {
      if (index === 0) {
        return ['Unique ID', ...row];
      }
      return [index.toString(), ...row];
    });

    // Update the spreadsheet with new data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      resource: { values: newData },
    });
  }
}

// Fetch registrations
router.get('/fetch-registrations', verifyToken, async (req, res) => {
  try {
    const activeSpreadsheetId = activeSpreadsheets.get(req.user.email);
    
    if (!activeSpreadsheetId) {
      return res.status(400).json({ success: false, message: 'No active spreadsheet set' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: activeSpreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values || [];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
  }
});

// Create group
router.post('/create-group', verifyToken, async (req, res) => {
  try {
    const { groupName, description, selectedFields } = req.body;
    const activeSpreadsheetId = activeSpreadsheets.get(req.user.email);

    if (!activeSpreadsheetId) {
      return res.status(400).json({ message: 'No active spreadsheet set' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Check if Group sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: activeSpreadsheetId,
    });

    const groupSheetExists = spreadsheet.data.sheets.some(
      sheet => sheet.properties.title === 'Group'
    );

    if (!groupSheetExists) {
      // Create Group sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: activeSpreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: { title: 'Group' }
            }
          }]
        }
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: activeSpreadsheetId,
        range: 'Group!A1:D1',
        valueInputOption: 'RAW',
        resource: {
          values: [['Group ID', 'Group Name', 'Description', 'Members']]
        }
      });
    }

    // Generate group ID
    const groupId = Date.now().toString();

    // Add group to Group sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: activeSpreadsheetId,
      range: 'Group!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          groupId,
          groupName,
          description,
          selectedFields.map(f => f.uniqueId).join(',')
        ]]
      }
    });

    res.json({ success: true, message: 'Group created successfully' });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group' });
  }
});

// Combine groups
router.post('/combine-groups', verifyToken, async (req, res) => {
  try {
    const { groupIds, newGroupName, description } = req.body;
    const activeSpreadsheetId = activeSpreadsheets.get(req.user.email);

    if (!activeSpreadsheetId) {
      return res.status(400).json({ message: 'No active spreadsheet set' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get existing groups
    const groupsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: activeSpreadsheetId,
      range: 'Group!A:D',
    });

    const groups = groupsResponse.data.values || [];
    const selectedGroups = groups.filter(group => groupIds.includes(group[0]));
    
    // Combine member IDs
    const allMembers = new Set();
    selectedGroups.forEach(group => {
      const members = group[3].split(',');
      members.forEach(member => allMembers.add(member.trim()));
    });

    // Create new combined group
    const newGroupId = Date.now().toString();
    await sheets.spreadsheets.values.append({
      spreadsheetId: activeSpreadsheetId,
      range: 'Group!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          newGroupId,
          newGroupName,
          description,
          Array.from(allMembers).join(',')
        ]]
      }
    });

    res.json({ success: true, message: 'Groups combined successfully' });
  } catch (error) {
    console.error('Error combining groups:', error);
    res.status(500).json({ message: 'Failed to combine groups' });
  }
});

// Delete users
router.delete('/delete-users', verifyToken, async (req, res) => {
  try {
    const { userIds } = req.body;
    const activeSpreadsheetId = activeSpreadsheets.get(req.user.email);

    if (!activeSpreadsheetId) {
      return res.status(400).json({ message: 'No active spreadsheet set' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: activeSpreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values || [];
    const headers = rows[0];
    const uniqueIdIndex = headers.findIndex(header => 
      header.toLowerCase().includes('unique')
    );

    // Filter out deleted users
    const newRows = rows.filter((row, index) => 
      index === 0 || !userIds.includes(row[uniqueIdIndex])
    );

    // Update spreadsheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: activeSpreadsheetId,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      resource: { values: newRows },
    });

    // Update groups
    const groupsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: activeSpreadsheetId,
      range: 'Group!A:D',
    });

    const groups = groupsResponse.data.values || [];
    const updatedGroups = groups.map((group, index) => {
      if (index === 0) return group; // Keep headers
      const members = group[3].split(',');
      const updatedMembers = members.filter(member => 
        !userIds.includes(member.trim())
      );
      return [...group.slice(0, 3), updatedMembers.join(',')];
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: activeSpreadsheetId,
      range: 'Group',
      valueInputOption: 'RAW',
      resource: { values: updatedGroups },
    });

    res.json({ success: true, message: 'Users deleted successfully' });
  } catch (error) {
    console.error('Error deleting users:', error);
    res.status(500).json({ message: 'Failed to delete users' });
  }
});

// Export to PDF
router.get('/export-pdf', verifyToken, async (req, res) => {
  try {
    const activeSpreadsheetId = activeSpreadsheets.get(req.user.email);

    if (!activeSpreadsheetId) {
      return res.status(400).json({ message: 'No active spreadsheet set' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: activeSpreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values || [];
    
    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=export.pdf');
    doc.pipe(res);

    // Add headers
    const headers = rows[0];
    let y = 50;
    headers.forEach((header, i) => {
      doc.text(header, 50 + (i * 100), y);
    });

    // Add data
    rows.slice(1).forEach((row, rowIndex) => {
      y = 70 + (rowIndex * 20);
      row.forEach((cell, i) => {
        doc.text(cell, 50 + (i * 100), y);
      });
    });

    doc.end();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).json({ message: 'Failed to export to PDF' });
  }
});

// Export to CSV
router.get('/export-csv', verifyToken, async (req, res) => {
  try {
    const activeSpreadsheetId = activeSpreadsheets.get(req.user.email);

    if (!activeSpreadsheetId) {
      return res.status(400).json({ message: 'No active spreadsheet set' });
    }

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: activeSpreadsheetId,
      range: 'Sheet1',
    });

    const rows = response.data.values || [];
    const headers = rows[0];
    
    // Convert to CSV
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });

    const parser = new Parser({ fields: headers });
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    res.status(500).json({ message: 'Failed to export to CSV' });
  }
});

export default router;