const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('./config/cloudinary'); // Cloudinary config (see below)
const Template = require('./models/Template');
const ejs = require('ejs');
const axios = require('axios');
const connectDB = require('./config/db');

connectDB();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Multer to get files in memory for direct Cloudinary upload
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to upload buffer to Cloudinary
const streamUpload = (buffer, resourceType, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: folder },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });
};

// Upload EJS template + image route
app.post('/upload-template', upload.fields([
  { name: 'resumeTemplate', maxCount: 1 },
  { name: 'templateImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const templateFile = req.files['resumeTemplate']?.[0];
    const imageFile = req.files['templateImage']?.[0];

    if (!templateFile || !imageFile) {
      return res.status(400).json({ success: false, message: 'Both template and image files are required.' });
    }

    // Upload EJS template as raw resource
    const templateResult = await streamUpload(templateFile.buffer, 'raw', 'resume_templates');

    // Upload image as image resource
    const imageResult = await streamUpload(imageFile.buffer, 'image', 'resume_template_images');

    // Save template and image metadata to MongoDB
    const newTemplate = new Template({
      templateId: uuidv4(),
      name: templateFile.originalname.replace('.ejs', ''),
      publicId: templateResult.public_id,
      url: templateResult.secure_url,
      imagePublicId: imageResult.public_id,
      imageUrl: imageResult.secure_url,
      uploadedBy: 'admin' // optional
    });

    await newTemplate.save();

    res.json({ success: true, template: newTemplate });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// List all templates
app.get('/templates', async (req, res) => {
  try {
    const templates = await Template.find().select('templateId name url imageUrl');
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch templates.' });
  }
});

// Render resume by templateId
app.get('/view-resume/:templateId', async (req, res) => {
  try {
    const template = await Template.findOne({ templateId: req.params.templateId });
    if (!template) return res.status(404).send('Template not found');

    // Fetch raw EJS content from Cloudinary using axios
    const { data: templateContent } = await axios.get(template.url);

    // Render EJS with resume data & template image URL
    const renderedHtml = ejs.render(templateContent, { 
      resumeData, 
      templateImage: template.imageUrl 
    });

    res.send(renderedHtml);
  } catch (error) {
    res.status(500).send('Error rendering template');
  }
});
console.log('Cloudinary uploader:', cloudinary.uploader);


app.listen(3005, () => console.log('Server running on http://localhost:3005'));
