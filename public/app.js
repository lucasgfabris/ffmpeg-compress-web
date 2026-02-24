const dropZone = document.getElementById('dropZone');
const videoInput = document.getElementById('videoInput');
const fileList = document.getElementById('fileList');
const uploadForm = document.getElementById('uploadForm');
const btnCompress = document.getElementById('btnCompress');
const jobsSection = document.getElementById('jobsSection');
const jobsList = document.getElementById('jobsList');
const jobsActions = document.getElementById('jobsActions');
const queueStatus = document.getElementById('queueStatus');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

const MAX_FILES = 5;
let selectedFiles = [];
let currentJobIds = [];
let pollingInterval = null;

dropZone.addEventListener('click', () => videoInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
  addFiles(files);
});

videoInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  addFiles(files);
  videoInput.value = '';
});

function addFiles(files) {
  for (const file of files) {
    if (selectedFiles.length >= MAX_FILES) {
      alert(`Máximo de ${MAX_FILES} arquivos permitidos`);
      break;
    }
    if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
      selectedFiles.push(file);
    }
  }
  updateFileList();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
}

function updateFileList() {
  fileList.innerHTML = '';
  
  if (selectedFiles.length === 0) {
    dropZone.classList.remove('has-files');
    btnCompress.disabled = true;
    return;
  }
  
  dropZone.classList.add('has-files');
  btnCompress.disabled = false;
  
  selectedFiles.forEach((file, index) => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <span class="file-item-name">${file.name}</span>
      <span class="file-item-size">${sizeMB} MB</span>
      <button type="button" class="file-item-remove" onclick="removeFile(${index})">×</button>
    `;
    fileList.appendChild(item);
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (selectedFiles.length === 0) return;
  
  const formData = new FormData();
  selectedFiles.forEach(file => {
    formData.append('videos', file);
  });
  formData.append('crf', document.getElementById('crf').value);
  formData.append('resolution', document.getElementById('resolution').value);
  
  uploadForm.hidden = true;
  jobsSection.hidden = false;
  errorSection.hidden = true;
  jobsActions.hidden = true;
  
  jobsList.innerHTML = selectedFiles.map((file, i) => `
    <div class="job-card" id="job-placeholder-${i}">
      <div class="job-card-header">
        <span class="job-filename">${file.name}</span>
        <span class="job-status queued">Enviando...</span>
      </div>
      <div class="job-progress">
        <div class="job-progress-bar">
          <div class="job-progress-fill" style="width: 0%"></div>
        </div>
      </div>
    </div>
  `).join('');
  
  try {
    const response = await fetch('/api/compress', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao processar vídeos');
    }
    
    currentJobIds = data.jobIds;
    startPolling();
    
  } catch (error) {
    showError(error.message);
  }
});

function startPolling() {
  pollProgress();
  pollingInterval = setInterval(pollProgress, 500);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function pollProgress() {
  try {
    const response = await fetch(`/api/status-batch?ids=${currentJobIds.join(',')}`);
    const jobs = await response.json();
    
    let allDone = true;
    let hasCompleted = false;
    
    for (const jobId of currentJobIds) {
      const job = jobs[jobId];
      if (job) {
        updateJobCard(jobId, job);
        if (job.status === 'processing' || job.status === 'queued') {
          allDone = false;
        }
        if (job.status === 'completed') {
          hasCompleted = true;
        }
      }
    }
    
    const queueResponse = await fetch('/api/queue-status');
    const queueData = await queueResponse.json();
    queueStatus.textContent = `${queueData.activeProcesses}/${queueData.maxConcurrent} processando`;
    
    if (allDone) {
      stopPolling();
      if (hasCompleted) {
        jobsActions.hidden = false;
      }
    }
    
  } catch (error) {
    console.error('Erro ao verificar progresso:', error);
  }
}

function updateJobCard(jobId, job) {
  let card = document.getElementById(`job-${jobId}`);
  
  if (!card) {
    const index = currentJobIds.indexOf(jobId);
    const placeholder = document.getElementById(`job-placeholder-${index}`);
    if (placeholder) {
      placeholder.id = `job-${jobId}`;
      card = placeholder;
    }
  }
  
  if (!card) return;
  
  card.className = `job-card ${job.status}`;
  
  const statusLabels = {
    queued: 'Na fila',
    processing: 'Processando',
    completed: 'Concluído',
    error: 'Erro'
  };
  
  let statsHtml = '';
  let actionsHtml = '';
  let errorHtml = '';
  
  if (job.status === 'completed') {
    statsHtml = `
      <div class="job-stats">
        <div class="job-stat">
          <span>Original:</span>
          <span class="job-stat-value">${formatSize(job.inputSize)}</span>
        </div>
        <div class="job-stat">
          <span>Final:</span>
          <span class="job-stat-value">${formatSize(job.outputSize)}</span>
        </div>
        <div class="job-stat highlight">
          <span>Redução:</span>
          <span class="job-stat-value">${job.compression}%</span>
        </div>
      </div>
    `;
    actionsHtml = `
      <div class="job-actions">
        <button class="job-btn job-btn-download" onclick="downloadJob('${jobId}')">
          ⬇️ Baixar
        </button>
      </div>
    `;
  } else if (job.status === 'error') {
    errorHtml = `<div class="job-error-message">${job.error || 'Erro desconhecido'}</div>`;
  }
  
  card.innerHTML = `
    <div class="job-card-header">
      <span class="job-filename">${job.inputFile}</span>
      <span class="job-status ${job.status}">${statusLabels[job.status]}</span>
    </div>
    ${job.status === 'processing' || job.status === 'queued' ? `
      <div class="job-progress">
        <div class="job-progress-bar">
          <div class="job-progress-fill" style="width: ${job.progress}%"></div>
        </div>
        <div class="job-progress-text">${job.progress}%</div>
      </div>
    ` : ''}
    ${statsHtml}
    ${actionsHtml}
    ${errorHtml}
  `;
}

function downloadJob(jobId) {
  window.location.href = `/api/download/${jobId}`;
}

document.getElementById('btnDownloadAll').addEventListener('click', async () => {
  const response = await fetch(`/api/status-batch?ids=${currentJobIds.join(',')}`);
  const jobs = await response.json();
  
  for (const jobId of currentJobIds) {
    if (jobs[jobId] && jobs[jobId].status === 'completed') {
      const link = document.createElement('a');
      link.href = `/api/download/${jobId}`;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(r => setTimeout(r, 500));
    }
  }
});

document.getElementById('btnNew').addEventListener('click', resetForm);
document.getElementById('btnRetry').addEventListener('click', resetForm);

function showError(message) {
  jobsSection.hidden = true;
  errorSection.hidden = false;
  errorMessage.textContent = message;
  stopPolling();
}

function resetForm() {
  stopPolling();
  
  if (currentJobIds.length > 0) {
    fetch(`/api/cleanup-batch?ids=${currentJobIds.join(',')}`, { method: 'DELETE' });
  }
  
  selectedFiles = [];
  currentJobIds = [];
  fileList.innerHTML = '';
  dropZone.classList.remove('has-files');
  btnCompress.disabled = true;
  jobsList.innerHTML = '';
  
  uploadForm.hidden = false;
  jobsSection.hidden = true;
  errorSection.hidden = true;
  jobsActions.hidden = true;
}

window.removeFile = removeFile;
window.downloadJob = downloadJob;
