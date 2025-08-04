// routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fsExtra = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
fsExtra.ensureDirSync(uploadDir);

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 
      'audio/webm', 'audio/mp3', 'audio/wav',
      'video/webm', 'video/mp4'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Save file info to database
    const fileInfo = await database.saveFileInfo({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.body.userId || 'unknown'
    });

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      fileName: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      id: fileInfo?.id
    });

    console.log(`📁 File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Delete file endpoint
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // In a real app, you'd remove from database and filesystem
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
