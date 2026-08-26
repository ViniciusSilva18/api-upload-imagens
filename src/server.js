'use strict';
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(cors()); app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) return cb(new Error('Tipo de ficheiro não permitido. Use JPEG, PNG, GIF ou WebP.'));
    cb(null, true);
  }
});

app.get('/', (req, res) => res.json({ service: 'Image Upload & Optimizer API', maxSize: '10MB', allowedTypes: ALLOWED }));

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  try {
    const filename = `img_${Date.now()}.webp`;
    const outputPath = path.join(__dirname, 'uploads', filename);
    const meta = await sharp(req.file.buffer)
      .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outputPath);
    const savings = ((1 - meta.size / req.file.size) * 100).toFixed(1);
    res.status(201).json({
      url: `/uploads/${filename}`, filename, format: 'webp',
      original: { size: req.file.size, type: req.file.mimetype },
      optimized: { size: meta.size, width: meta.width, height: meta.height },
      savings: `${savings}% menor`,
    });
  } catch (e) { res.status(500).json({ error: 'Erro ao processar imagem.', details: e.message }); }
});

app.post('/upload/multiple', upload.array('images', 10), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  const results = await Promise.all(req.files.map(async (file) => {
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
    const outputPath = path.join(__dirname, 'uploads', filename);
    const meta = await sharp(file.buffer).resize({ width: 1920, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(outputPath);
    return { url: `/uploads/${filename}`, filename, originalSize: file.size, optimizedSize: meta.size };
  }));
  res.status(201).json({ uploaded: results.length, files: results });
});

app.listen(3000, () => console.log('🖼️  Image Upload API em http://localhost:3000'));
