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
console.log(path.join(__dirname, 'views', 'partials', 'header.ejs'))

const allowedTemplates = ["01", "02", "03","04","05","06","07","08","09","10"];

const multer = require('multer');
const upload = multer({ dest: 'public/images/uploads/' });

app.post('/upload-profile-image', upload.single('profileImage'), (req, res) => {
  if (req.file) {
    const imagePath = `/images/uploads/${req.file.filename}`;
    // Save this path to your database or session
    res.json({ success: true, imagePath });
  } else {
    res.status(400).json({ success: false });
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



app.listen(3005, () => console.log('Server running on http://localhost:3005'));
