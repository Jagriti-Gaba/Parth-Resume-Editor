require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('./config/cloudinary'); // ✅ export of configured cloudinary.v2
const Template = require('./models/Template'); // Mongo model
const ejs = require('ejs');
const axios = require('axios');
const connectDB = require('./config/db');


// ✅ Connect to MongoDB
connectDB();

const app = express();

// ----- EJS + Static Middleware -----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ----- Hardcoded resume data -----

// ----- Local allowedTemplates logic -----
const templatesDir = path.join(__dirname, 'views/resume_templates');

function loadAllowedTemplates() {
  return fs.readdirSync(templatesDir)
    .filter(file => /^resume_\d+\.ejs$/.test(file)) // only files like resume_01.ejs
    .map(file => file.match(/\d+/)[0]); // extract just the number
}

let allowedTemplates = loadAllowedTemplates();

// ----- Multer storage for local .ejs uploads -----
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, templatesDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const localTemplateUpload = multer({
  storage: localStorage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname) === '.ejs') cb(null, true);
    else cb(new Error('Only .ejs files allowed!'));
  }
});

// ----- Multer memory storage for Cloudinary -----
const memoryUpload = multer({ storage: multer.memoryStorage() });

// ----- Helper to upload buffer to Cloudinary -----
const streamUpload = (buffer, resourceType, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });
};

//
// ----------- ROUTES ------------
//

// ✅ Upload local EJS template into /views/resume_templates
app.post('/upload-local-template', localTemplateUpload.single('resumeTemplate'), (req, res) => {
  if (req.file) {
    allowedTemplates = loadAllowedTemplates();
    return res.json({ success: true, filename: req.file.filename, allowedTemplates });
  } else {
    return res.status(400).json({ success: false, message: 'No file uploaded or incorrect file type.' });
  }
});

// ✅ Upload EJS + image to Cloudinary & store metadata in DB
app.post('/upload-template', memoryUpload.fields([
  { name: 'resumeTemplate', maxCount: 1 },
  { name: 'templateImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const templateFile = req.files['resumeTemplate']?.[0];
    const imageFile = req.files['templateImage']?.[0];
    if (!templateFile || !imageFile) {
      return res.status(400).json({ success: false, message: 'Both template and image files are required.' });
    }

    const templateResult = await streamUpload(templateFile.buffer, 'raw', 'resume_templates');
    const imageResult = await streamUpload(imageFile.buffer, 'image', 'resume_template_images');

    const newTemplate = new Template({
      templateId: uuidv4(),
      name: templateFile.originalname.replace('.ejs', ''),
      publicId: templateResult.public_id,
      url: templateResult.secure_url,
      imagePublicId: imageResult.public_id,
      imageUrl: imageResult.secure_url,
      uploadedBy: 'admin',
    });

    await newTemplate.save();
    res.json({ success: true, template: newTemplate });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// ✅ List all Cloudinary templates from DB
app.get('/templates', async (req, res) => {
  try {
    const templates = await Template.find().select('templateId name url imageUrl');
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch templates.' });
  }
});

// ✅ Old-style local route: open editor for template from local folder
app.get('/resume/:templateId', (req, res) => {
  const templateId = req.params.templateId;
  if (!allowedTemplates.includes(templateId)) {
    return res.status(404).send('Template not found');
  }
  res.render('editor', { 
    resumeData,
    selectedTemplate: `resume_templates/resume_${templateId}`,
    templateId
  });
});

// ✅ Old-style local route: view resume rendered from local folder template
app.get('/view-resume/:templateId/:registrationNo', async (req, res) => {
  const { templateId, registrationNo } = req.params;

  // 1️⃣ Check if template exists locally
  if (!allowedTemplates.includes(templateId)) {
    return res.status(404).send('Template not found');
  }

  try {
    // 2️⃣ Fetch resume data from backend API
    const { data: resumeData } = await axios.get(
      `http://localhost:3000/api/profile/get/${registrationNo}`
    );

    // 3️⃣ Render template with data (empty fallback)
    res.render(`resume_templates/resume_${templateId}`, { 
      resumeData: resumeData || {} 
    });

  } catch (error) {
    console.error('❌ Error fetching resume data:', error.message);

    // 4️⃣ Render empty placeholders instead of error page
    res.render(`resume_templates/resume_${templateId}`, { 
      resumeData: {} 
    });
  }
});

// ✅ Cloudinary-based view route: fetch .ejs from Cloudinary and render with data
app.get('/view-cloud-resume/:templateId', async (req, res) => {
  try {
    const template = await Template.findOne({ templateId: req.params.templateId });
    if (!template) return res.status(404).send('Template not found');
    
    const { data: templateContent } = await axios.get(template.url);
    const renderedHtml = ejs.render(templateContent, { 
      resumeData, 
      templateImage: template.imageUrl 
    });
    res.send(renderedHtml);

  } catch (error) {
    res.status(500).send('Error rendering template');
  }
});

//
// --------- START SERVER ---------
app.listen(3005, () => console.log('🚀 Server running on http://localhost:3005'));
