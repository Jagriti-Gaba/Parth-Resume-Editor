const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  templateId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  publicId: { type: String, required: true },
  url: { type: String, required: true },
  imagePublicId: { type: String, required: true },
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  uploadedBy: { type: String }
});

module.exports = mongoose.model('Template', templateSchema);
