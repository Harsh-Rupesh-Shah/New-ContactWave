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

router.post("/send-whatsapp", upload.array("files"), async (req, res) => {
  const { header, message, recipients, template } = req.body;
  let parsedTemplate;
    try {
      parsedTemplate = JSON.parse(template);
      console.log('Parsed Template:', JSON.stringify(parsedTemplate, null, 2));
    } catch (error) {
      console.error('Template Parse Error:', error);
      return res.status(400).json({ 
        error: "Invalid template format",
        details: error.message,
        receivedTemplate: template
      });
    }

    // 2. Validate template structure
    if (!parsedTemplate.name || !parsedTemplate.components) {
      return res.status(400).json({
        error: "Invalid template structure",
        requiredFields: ["name", "components"],
        receivedTemplate: parsedTemplate
      });
    }

    const processedComponents = parsedTemplate.components.map(component => {
        if (!component.parameters) return component;
        
        const newParameters = [];
        
        component.parameters.forEach(param => {
          if (param.type === "text") {
            // Extract all parameter placeholders (like {{1}}, {{2}})
            const matches = param.text.match(/\{\{(\d+)\}\}/g) || [];
            
            if (matches.length > 0) {
              // For each placeholder, create a separate parameter
              matches.forEach(match => {
                const index = match.replace(/\D/g, '');
                newParameters.push({
                  type: "text",
                  text: param.text.includes(match) ? match : param.text
                });
              });
            } else {
              // If no placeholders, keep the original text
              newParameters.push({
                type: "text",
                text: param.text
              });
            }
          } else {
            // Keep non-text parameters as-is
            newParameters.push(param);
          }
        });
        
        return {
          type: component.type,
          parameters: newParameters
        };
      });
  
  const files = req.files;
  console.log("header", req.body);
  console.log("Recipients received:", recipients);
  let parsedRecipients;

  try {
    parsedRecipients = JSON.parse(recipients);
  } catch (error) {
    return res
      .status(400)
      .json({ error: "Invalid recipients format. Expected a JSON array." });
  }

  const formatPhoneNumber = (number) => {
    if (!number) return null;
    let formattedNumber = String(number).trim().replace(/\D+/g, "");
    if (formattedNumber.length === 10) {
      formattedNumber = `91${formattedNumber}`;
    }
    const phoneRegex = /^91\d{10}$/;
    return phoneRegex.test(formattedNumber) ? formattedNumber : null;
  };

  const validRecipients = parsedRecipients
    .map((recipient) => {
      const formattedPhone = formatPhoneNumber(recipient.phone);
      console.log("Original:", recipient.phone, "Formatted:", formattedPhone);
      if (!formattedPhone) {
        console.log(`Invalid phone number: ${recipient.phone}`);
        return null;
      }
      return { ...recipient, phone: formattedPhone };
    })
    .filter((recipient) => recipient !== null);

  if (validRecipients.length === 0) {
    return res.status(400).json({ error: "No valid recipients found." });
  }

  try {
    const results = [];
    const fileUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto",
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
        console.log(`Sending message to: ${recipient.phone}`);
        try {
          let messageOptions;
          

          if (files.length > 0) {
            const fileType = files[0].mimetype.startsWith("image/")
              ? "image"
              : "video";

            if (fileType === "image") {
              messageOptions = {
                messaging_product: "whatsapp",
                to: recipient.phone,
                type: "template",
                template: {
                  name: "text_image",
                  language: { code: "en_US" },
                  components: [
                    {
                      type: "header",
                      parameters: [
                        { type: "image", image: { link: fileUrls[0] } },
                      ],
                    },
                    {
                      type: "body",
                      parameters: [{ type: "text", text: `${message}` }],
                    },
                  ],
                },
              };
            } else if (fileType === "video") {
              messageOptions = {
                messaging_product: "whatsapp",
                to: recipient.phone,
                type: "template",
                template: {
                  name: "text_video",
                  language: { code: "en_US" },
                  components: [
                    {
                      type: "header",
                      parameters: [
                        { type: "video", video: { link: fileUrls[0] } },
                      ],
                    },
                    {
                      type: "body",
                      parameters: [{ type: "text", text: `${message}` }],
                    },
                  ],
                },
              };
            }
          } else {
            messageOptions = {
                messaging_product: "whatsapp",
                to: recipient.phone,
                type: "template",
                // template: {
                //   name: parsedTemplate.name,
                //   language: { code: parsedTemplate.language?.code || "en_US" }, // Optional chaining for safety
                // //   components: parsedTemplate.components.map((component) => ({
                // //     type: component.type,
                // //     parameters: component.parameters || [],
                // //   })),
                // // components: []
                // components: processedComponents
                // },
                template: {
                name: parsedTemplate.name,
                language: { code: parsedTemplate.language?.code || "en_US" },
                components: processedComponents.map(component => {
                  // Replace placeholders with actual values from recipient data
                  const parameters = component.parameters.map(param => {
                    if (param.type === "text") {
                      // Check if the text contains a placeholder
                      const match = param.text.match(/\{\{(\d+)\}\}/);
                      if (match) {
                        const placeholder = match[0];
                        const index = match[1];
                        // Replace with actual data (you might need to adjust this based on your data structure)
                        const value = recipient.data[`param${index}`] || placeholder;
                        return {
                          type: "text",
                          text: value
                        };
                      }
                    }
                    return param;
                  });
                  
                  return {
                    type: component.type,
                    parameters: parameters
                  };
                })
              }
              };
          }

          console.log(
            "Final Message Payload:",
            JSON.stringify(messageOptions, null, 2)
          );

          const response = await axios.post(
            process.env.WHATSAPP_API_ID,
            messageOptions,
            {
              headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );

          results.push({
            ...recipient,
            status: "success",
            messageId: response.data?.messages?.[0]?.id,
          });
        } catch (error) {
          console.error(
            `Error sending WhatsApp message to ${recipient.phone}:`,
            error.message
          );
          results.push({
            ...recipient,
            status: "failed",
            error: error.response?.data || error.message,
          });
        }
      })
    );

    res.status(200).json({
      success: true,
      message: `WhatsApp messages sent successfully to ${validRecipients.length} recipients!`,
      results,
    });
  } catch (error) {
    console.error("Error sending WhatsApp messages:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to send WhatsApp messages." });
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
      id: template.id,
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