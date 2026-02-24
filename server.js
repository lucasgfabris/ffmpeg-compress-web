const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_CONCURRENT = 5;

const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

[uploadsDir, outputDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de vídeo são permitidos'));
    }
  }
});

app.use(express.static('public'));
app.use('/output', express.static(outputDir));

const jobs = new Map();

let activeProcesses = 0;
const processingQueue = [];

function processNext() {
  while (activeProcesses < MAX_CONCURRENT && processingQueue.length > 0) {
    const task = processingQueue.shift();
    activeProcesses++;
    startFFmpegProcess(task);
  }
}

function startFFmpegProcess({ jobId, inputPath, outputPath, crf, resolution }) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  jobs.set(jobId, job);

  const scaleFilter = resolution !== 'original' ? {
    '1080p': 'scale=1920:-2',
    '720p': 'scale=1280:-2',
    '480p': 'scale=854:-2',
    '360p': 'scale=640:-2'
  }[resolution] : null;

  let command = ffmpeg(inputPath)
    .outputOptions([
      '-y',
      '-c:v', 'libx264',
      '-crf', String(crf),
      '-preset', 'medium',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      '-max_muxing_queue_size', '1024'
    ]);

  if (scaleFilter) {
    command = command.outputOptions(['-vf', scaleFilter]);
  }

  command
    .on('progress', (progress) => {
      const job = jobs.get(jobId);
      if (job) {
        job.progress = Math.round(progress.percent || 0);
        jobs.set(jobId, job);
      }
    })
    .on('end', () => {
      activeProcesses--;
      const job = jobs.get(jobId);
      if (job) {
        job.status = 'completed';
        job.progress = 100;

        try {
          const inputStats = fs.statSync(inputPath);
          const outputStats = fs.statSync(outputPath);
          job.inputSize = inputStats.size;
          job.outputSize = outputStats.size;
          job.compression = Math.round((1 - outputStats.size / inputStats.size) * 100);
        } catch (e) {
          console.error('Erro ao obter stats:', e.message);
        }

        jobs.set(jobId, job);
      }

      fs.unlink(inputPath, () => {});
      processNext();
    })
    .on('error', (err, stdout, stderr) => {
      activeProcesses--;
      console.error('Erro no FFmpeg:', err.message);
      console.error('FFmpeg stderr:', stderr);
      const job = jobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = err.message || 'Erro desconhecido no FFmpeg';
        jobs.set(jobId, job);
      }

      fs.unlink(inputPath, () => {});
      processNext();
    })
    .save(outputPath);
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Arquivo muito grande. Limite: 5GB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: `Máximo de ${MAX_CONCURRENT} arquivos por vez` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.post('/api/compress', upload.array('videos', MAX_CONCURRENT), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const crf = parseInt(req.body.crf) || 23;
  const resolution = req.body.resolution || 'original';

  const jobIds = [];

  for (const file of req.files) {
    const jobId = uuidv4();
    const inputPath = file.path;
    const outputFilename = `compressed_${jobId}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);

    jobs.set(jobId, {
      status: 'queued',
      progress: 0,
      inputFile: file.originalname,
      outputFile: outputFilename,
      inputSize: file.size
    });

    processingQueue.push({
      jobId,
      inputPath,
      outputPath,
      crf,
      resolution
    });

    jobIds.push(jobId);
  }

  processNext();

  res.json({ 
    jobIds, 
    message: `${req.files.length} vídeo(s) adicionado(s) à fila` 
  });
});

app.get('/api/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job não encontrado' });
  }
  res.json({ ...job, jobId: req.params.jobId });
});

app.get('/api/status-batch', (req, res) => {
  const jobIds = req.query.ids ? req.query.ids.split(',') : [];
  const results = {};
  
  for (const jobId of jobIds) {
    const job = jobs.get(jobId);
    if (job) {
      results[jobId] = { ...job, jobId };
    }
  }
  
  res.json(results);
});

app.get('/api/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.status !== 'completed') {
    return res.status(404).json({ error: 'Arquivo não disponível' });
  }

  const filePath = path.join(outputDir, job.outputFile);
  res.download(filePath, `compressed_${job.inputFile}`);
});

app.delete('/api/cleanup/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (job && job.outputFile) {
    const filePath = path.join(outputDir, job.outputFile);
    fs.unlink(filePath, () => {});
    jobs.delete(req.params.jobId);
  }
  res.json({ success: true });
});

app.delete('/api/cleanup-batch', (req, res) => {
  const jobIds = req.query.ids ? req.query.ids.split(',') : [];
  
  for (const jobId of jobIds) {
    const job = jobs.get(jobId);
    if (job && job.outputFile) {
      const filePath = path.join(outputDir, job.outputFile);
      fs.unlink(filePath, () => {});
      jobs.delete(jobId);
    }
  }
  
  res.json({ success: true });
});

app.get('/api/queue-status', (req, res) => {
  res.json({
    activeProcesses,
    queueLength: processingQueue.length,
    maxConcurrent: MAX_CONCURRENT
  });
});

app.listen(PORT, () => {
  console.log(`🎬 Video Converter rodando em http://localhost:${PORT}`);
  console.log(`   Processamento paralelo: até ${MAX_CONCURRENT} vídeos`);
});
