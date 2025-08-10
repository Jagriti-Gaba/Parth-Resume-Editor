// const express = require('express');
// const router = express.Router();

// // Dummy database for example (replace with real DB logic)
// const resumes = {
//   "1": {
//     template: "professional",
//     sections: [
//       { title: "Summary", content: "A professional developer..." },
//       { title: "Skills", content: "<ul><li>JS</li><li>CSS</li></ul>" }
//     ],
//   }
//   // ...other resumes
// };

// router.get('/resume/:resumeId', (req, res) => {
//   const resume = resumes[req.params.resumeId];
//   if (!resume) return res.status(404).send('Resume not found');
//   res.render('resume', { resume });
// });

// module.exports = router;
