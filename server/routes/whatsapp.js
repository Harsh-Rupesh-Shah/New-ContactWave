import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: '/tmp',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dblfwakqw",
  api_key: "976651353429281",
  api_secret: "JnP_Yj5m-q-J5-STGukqyzfY2uE",
});

// WhatsApp API configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const ACCESS_TOKEN = process.env.BEARER_TOKEN;
const BUSINESS_ACCOUNT_ID = process.env.BUSINESS_ACCOUNT_ID;

// Helper function to format phone numbers
const formatPhoneNumber = (number) => {
  if (!number) return null;
  let formattedNumber = String(number).trim().replace(/\D+/g, "");
  if (formattedNumber.length === 10) {
    formattedNumber = `91${formattedNumber}`;
  }
  const phoneRegex = /^91\d{10}$/;
  return phoneRegex.test(formattedNumber) ? formattedNumber : null;
};

// Send WhatsApp message
router.post('/send-whatsapp', upload.array('files'), async (req, res) => {
  const { header, message, recipients, template } = req.body;
  const files = req.files;

  let parsedTemplate;
  try {
    parsedTemplate = JSON.parse(template);
  } catch (error) {
    console.error('Template Parse Error:', error);
    return res.status(400).json({ 
      error: "Invalid template format",
      details: error.message
    });
  }

  if (!parsedTemplate.name || !parsedTemplate.components) {
    return res.status(400).json({
      error: "Invalid template structure",
      requiredFields: ["name", "components"]
    });
  }

  let parsedRecipients;
  try {
    parsedRecipients = JSON.parse(recipients);
  } catch (error) {
    return res.status(400).json({ 
      error: "Invalid recipients format" 
    });
  }

  const validRecipients = parsedRecipients
    .map((recipient) => {
      const formattedPhone = formatPhoneNumber(recipient.phone);
      if (!formattedPhone) {
        console.log(`Invalid phone number: ${recipient.phone}`);
        return null;
      }
      return { ...recipient, phone: formattedPhone };
    })
    .filter((recipient) => recipient !== null);

  if (validRecipients.length === 0) {
    return res.status(400).json({ error: "No valid recipients found" });
  }

  try {
    const results = [];
    const fileUrls = await Promise.all(
      (files || []).map(async (file) => {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto"
          });
          return result.secure_url;
        } catch (error) {
          console.error("Error uploading to Cloudinary:", error);
          throw error;
        }
      })
    );

    await Promise.all(
      validRecipients.map(async (recipient) => {
        try {
          let messageOptions = {
            messaging_product: "whatsapp",
            to: recipient.phone,
            type: "template",
            template: {
              name: parsedTemplate.name,
              language: { code: parsedTemplate.language?.code || "en_US" },
              components: parsedTemplate.components.map(component => {
                if (component.type === "HEADER" && files?.length > 0) {
                  return {
                    type: "header",
                    parameters: [
                      { 
                        type: files[0].mimetype.startsWith("image/") ? "image" : "video",
                        [files[0].mimetype.startsWith("image/") ? "image" : "video"]: { 
                          link: fileUrls[0] 
                        }
                      }
                    ]
                  };
                }

                return {
                  type: component.type,
                  parameters: component.parameters.map(param => {
                    if (param.type === "text") {
                      const match = param.text.match(/\{\{(\d+)\}\}/);
                      if (match) {
                        const value = recipient.data[`param${match[1]}`] || param.text;
                        return { type: "text", text: value };
                      }
                    }
                    return param;
                  })
                };
              })
            }
          };

          const response = await axios.post(WHATSAPP_API_URL, messageOptions, {
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              "Content-Type": "application/json"
            }
          });

          results.push({
            phone: recipient.phone,
            status: "success",
            messageId: response.data?.messages?.[0]?.id
          });
        } catch (error) {
          console.error(`Error sending WhatsApp message to ${recipient.phone}:`, error);
          results.push({
            phone: recipient.phone,
            status: "failed",
            error: error.response?.data || error.message
          });
        }
      })
    );

    res.status(200).json({
      success: true,
      message: `WhatsApp messages sent to ${validRecipients.length} recipients`,
      results
    });
  } catch (error) {
    console.error("Error sending WhatsApp messages:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to send WhatsApp messages" 
    });
  }
});

// Get all templates
router.get('/get-all-templates', async (req, res) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${BUSINESS_ACCOUNT_ID}/message_templates`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    const formattedTemplates = response.data.data.map(template => ({
      messaging_product: "whatsapp",
      type: "template",
      category: template.category || "utility",
      template: {
        name: template.name,
        language: {
          code: template.language || "en"
        },
        components: template.components
          ? template.components.map(component => {
              if (["HEADER", "BODY", "FOOTER"].includes(component.type)) {
                return {
                  type: component.type,
                  parameters: [
                    {
                      type: "text",
                      text: component.text || ""
                    }
                  ]
                };
              }
              return component;
            })
          : []
      }
    }));

    res.json({ templates: formattedTemplates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      error: error.response?.data || "Server Error" 
    });
  }
});

// Delete template
router.delete('/delete-template/:template_id/:template_name', async (req, res) => {
  const { template_name, template_id } = req.params;
  
  try {
    await axios.delete(
      `https://graph.facebook.com/v19.0/${BUSINESS_ACCOUNT_ID}/message_templates`,
      {
        params: {
          name: template_name,
          hsm_id: template_id
        },
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    res.json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    console.error(error);
    if (error.response?.data?.error?.code === 100) {
      res.status(404).json({
        error: "Template not found or cannot be deleted"
      });
    } else {
      res.status(500).json({
        error: error.response?.data || "Server Error"
      });
    }
  }
});

export default router;