const express = require('express');
const app = express();
const path = require('path');

const resumeData = {
  name: "Jagriti Gaba",
  phone: "+91 895009584",
  email: "dilipkumar.docx@fes.higmail.com",
  profileImage: "/Jagriti Profile.jpg",
  education: [
    {
      degree: "Govt. College Chhachhrauli - Kurukshetta University",
      school: "Yanumanagar, Haryana",
      date: "Aug. 2022 - Mar. 2025",
      major: "Bachelor of Computer Applications (BCA)"
    },
    {
      degree: "Govt. Sr. Sec. School, Workshop - Jagadhti",
      school: "Yanumanagar, Haryana",
      date: "July 2020 - June 2022",
      major: "Commerce with maths"
    }
  ],
  experience: [
    {
      position: "Full Stack Engineer",
      company: "at NextGo ERI",
      date: "June 2024 - present",
      responsibilities: [
        "Developed a job portal web application enabling recruiters to post positions...",
        "Built comprehensive authentication system with JWT-based security...",
      ]
    }
  ],
  projects: [
    {
      name: "RessScope AI",
      technologies: "Net.js, Tailwind, Material UI, Gap",
      link: "#",
      date: "July 2025 - July 2025",
      details: [
        "Developed and implemented an AI-powered resume scoring system...",
      ]
    },
  ],
  skills: {
    "Languages": ["C", "C++", "JavaScript", "HTML/CSS", "Go", "Python", "SQL"],
    "Frameworks": ["Node.js", "Express.js", "Django", "React", "Nextjs"],
  },
  achievements: [
    "Achieved 'Role of Honour' for obtaining 'The Best explanation' award in State Level Exhibition among 150+ colleges."
  ]
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));




//to populate array
const fs = require('fs');
const templatesDir = path.join(__dirname, 'views/resume_templates');

// Load allowed templates dynamically from folder
function loadAllowedTemplates() {
  return fs.readdirSync(templatesDir)
    .filter(file => /^resume_\d+\.ejs$/.test(file)) // only files like resume_01.ejs
    .map(file => file.match(/\d+/)[0]); // extract the number as string (e.g. "01")
}

let allowedTemplates = loadAllowedTemplates();




const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'views/resume_templates'));
  },
  filename: function (req, file, cb) {
    // Optional: sanitize or process file name
    cb(null, file.originalname); // Save as original name (e.g. "resume_11.ejs")
  }
});
const templateUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept .ejs files
    if (path.extname(file.originalname) === '.ejs') {
      cb(null, true);
    } else {
      cb(new Error('Only .ejs files allowed!'));
    }
  }
});


app.post('/upload-template', templateUpload.single('resumeTemplate'), (req, res) => {
  if (req.file) {
    // Refresh allowedTemplates after new file is added
    allowedTemplates = loadAllowedTemplates();
    res.json({ success: true, filename: req.file.filename, allowedTemplates });
  } else {
    res.status(400).json({ success: false, message: 'No file uploaded or file type incorrect.' });
  }
});



app.get('/resume/:templateId', (req, res) => {
  const templateId = req.params.templateId;

  if (!allowedTemplates.includes(templateId)) {
    return res.status(404).send('Template not found');
  }

  // Render the matching template inside views/resumes_template/
 // Pass the hardcoded resume data and templateId (filename) to the editor
  res.render('editor', { 
    resumeData,               // your hardcoded resume data for embedding
    selectedTemplate: `resume_templates/resume_${templateId}`,// path to partial/template
    templateId,
  });
});

app.get('/view-resume/:templateId', (req, res) => {
  const templateId = req.params.templateId;

  if (!allowedTemplates.includes(templateId)) {
    return res.status(404).send('Template not found');
  }

  // Here you could also fetch resumeData from DB by userId instead of hardcoding
  res.render(
    `resume_templates/resume_${templateId}`, // directly render template partial
    { resumeData } // pass the filled resume data
  );
});

//for debugging
app.get('/list-templates', (req, res) => {
  res.json({ allowedTemplates });
});


app.listen(3005, () => console.log('Server running on http://localhost:3005'));
