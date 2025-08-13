require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('./config/cloudinary'); 
const Template = require('./models/Template'); 
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

// ----- Local allowedTemplates logic -----
const templatesDir = path.join(__dirname, 'views/resume_templates');

function loadAllowedTemplates() {
  return fs.readdirSync(templatesDir)
    .filter(file => /^resume_\d+\.ejs$/.test(file)) 
    .map(file => file.match(/\d+/)[0]); 
}
let allowedTemplates = loadAllowedTemplates();

// ----- Multer storages -----
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
const memoryUpload = multer({ storage: multer.memoryStorage() });

// ----- Cloudinary helper -----
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

// ----- Data mapper: API → Template shape -----
function mapApiToTemplate(data) {
  return {
    // Personal details
    name: data.studentProfile?.name || '',
    email: data.studentProfile?.email || '',
    phone: data.studentProfile?.phone || '',
    address: data.studentProfile?.address || '',
    field: data.studentProfile?.field || '',
    batchYear: data.studentProfile?.batchYear || '',
    profilePic: data.studentProfile?.profilePic || '',

    // Education
    education: (data.education || []).map(edu => ({
      degree: edu.degree,
      school: edu.institution,
      fieldOfStudy: edu.fieldOfStudy,
      date: `${new Date(edu.startDate).getFullYear()} - ${new Date(edu.endDate).getFullYear()}`,
      grade: edu.grade,
      description: edu.description
    })),

    // Experience
    experience: (data.experiences || []).map(exp => ({
      position: exp.title,
      company: exp.company,
      date: `${new Date(exp.startDate).getFullYear()} - ${new Date(exp.endDate).getFullYear()}`,
      responsibilities: exp.description ? [exp.description] : []
    })),

    // Skills (grouped under "General")
    skills: {
      General: (data.skills || []).map(s => s.skill)
    },

    // Projects
    projects: (data.projects || []).map(p => ({
      name: p.title,
      date: new Date(p.date).getFullYear(),
      technologies: p.techStack,
      details: [p.description]
    })),

    achievements: data.achievements || [],
    volunteering: data.volunteering || [],
    certificates: data.certificates || [],

    // Social links (if available)
    social: data.StudentSetting && data.StudentSetting.length > 0 ? {
      linkedin: data.StudentSetting[0].linkedin || '',
      github: data.StudentSetting[0].github || '',
      twitter: data.StudentSetting[0].twitter || '',
      portfolio: data.StudentSetting[0].portfolio || ''
    } : {}
  };
}

// ----------- ROUTES ------------

// ✅ Upload local EJS template
app.post('/upload-local-template', localTemplateUpload.single('resumeTemplate'), (req, res) => {
  if (req.file) {
    allowedTemplates = loadAllowedTemplates();
    return res.json({ success: true, filename: req.file.filename, allowedTemplates });
  }
  return res.status(400).json({ success: false, message: 'No file uploaded or incorrect file type.' });
});

// ✅ Upload EJS + image to Cloudinary
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

// ✅ List all Cloudinary templates
app.get('/templates', async (req, res) => {
  try {
    const templates = await Template.find().select('templateId name url imageUrl');
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch templates.' });
  }
});

// ✅ Old-style local route (empty data for load)
app.get('/resume/:templateId', (req, res) => {
  const templateId = req.params.templateId;
  if (!allowedTemplates.includes(templateId)) {
    return res.status(404).send('Template not found');
  }
  res.render('editor', { 
    resumeData: {}, 
    selectedTemplate: `resume_templates/resume_${templateId}`,
    templateId
  });
});

// ✅ Local editor route with real API data
app.get('/resume/:templateId/:registrationNo', async (req, res) => {
  const { templateId, registrationNo } = req.params;
  if (!allowedTemplates.includes(templateId)) {
    return res.status(404).send('Template not found');
  }

  try {
    const { data } = await axios.get(
      `http://localhost:3000/api/profile/get/${registrationNo}`
    );
    const resumeData = mapApiToTemplate(data);

    res.render('editor', { 
      resumeData, 
      selectedTemplate: `resume_templates/resume_${templateId}`,
      templateId
    });

  } catch (error) {
    console.error('❌ Error fetching resume data:', error.message);
    res.render('editor', { 
      resumeData: {}, 
      selectedTemplate: `resume_templates/resume_${templateId}`,
      templateId
    });
  }
});

// ✅ Cloudinary-based view route
app.get('/view-cloud-resume/:templateId/:registrationNo', async (req, res) => {
  try {
    const { templateId, registrationNo } = req.params;
    const template = await Template.findOne({ templateId });
    if (!template) return res.status(404).send('Template not found');

    const { data } = await axios.get(
      `http://localhost:3000/api/profile/get/${registrationNo}`
    );
    const resumeData = mapApiToTemplate(data);

    const { data: templateContent } = await axios.get(template.url);

    const renderedHtml = ejs.render(templateContent, { 
      resumeData, 
      templateImage: template.imageUrl 
    });

    res.send(renderedHtml);

  } catch (error) {
    console.error('❌ Error rendering cloud resume:', error.message);
    res.status(500).send('Error rendering template');
  }
});

// --------- START SERVER ---------
app.listen(3005, () => console.log('🚀 Server running on http://localhost:3005'));
