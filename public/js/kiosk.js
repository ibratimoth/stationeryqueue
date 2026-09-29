let selectedFile = null;
let currentBlobUrl = null;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

// Exact original listeners
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFileSelect(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('border-delle-teal', 'bg-delle-teal-light/50');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('border-delle-teal', 'bg-delle-teal-light/50');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('border-delle-teal', 'bg-delle-teal-light/50');
  if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
});

function togglePageInput() {
  const selectedOption = document.querySelector('input[name="printRangeType"]:checked').value;
  const customContainer = document.getElementById('customPageInputContainer');
  
  if (selectedOption === 'custom') {
    customContainer.classList.remove('hidden');
  } else {
    customContainer.classList.add('hidden');
  }
}

function handleFileSelect(file) {
  if (!file) return;
  selectedFile = file;

  // Clean up previous blob URL if exists to avoid memory leak
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
  }

  // Update UI for file selection
  document.getElementById('promptContent').classList.add('hidden');
  document.getElementById('fileInfo').classList.remove('hidden');
  document.getElementById('previewContainer').classList.remove('hidden');
  document.getElementById('pageSelectionSection').classList.remove('hidden');

  document.getElementById('fileName').innerText = file.name;
  document.getElementById('fileSize').innerText = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

  const ext = file.name.split('.').pop().toLowerCase();
  
  const iconMap = {
    pdf: '<i class="fa-solid fa-file-pdf text-red-500"></i>',
    docx: '<i class="fa-solid fa-file-word text-blue-500"></i>',
    xlsx: '<i class="fa-solid fa-file-excel text-emerald-500"></i>'
  };
  document.getElementById('fileIcon').innerHTML = iconMap[ext] || '<i class="fa-solid fa-file"></i>';

  const pdfFrame = document.getElementById('pdfPreviewFrame');
  const docPlaceholder = document.getElementById('docPlaceholder');

  // Handle PDF preview vs Office file placeholders
  if (ext === 'pdf') {
    currentBlobUrl = URL.createObjectURL(file);
    pdfFrame.src = currentBlobUrl;
    pdfFrame.classList.remove('hidden');
    docPlaceholder.classList.add('hidden');
  } else {
    pdfFrame.classList.add('hidden');
    docPlaceholder.classList.remove('hidden');
    
    document.getElementById('docNameDisplay').innerText = file.name;
    const badge = document.getElementById('docTypeBadge');
    
    if (ext === 'docx') {
      badge.className = 'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto bg-blue-50 text-blue-600';
      badge.innerHTML = '<i class="fa-solid fa-file-word"></i>';
    } else if (ext === 'xlsx') {
      badge.className = 'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto bg-emerald-50 text-emerald-600';
      badge.innerHTML = '<i class="fa-solid fa-file-excel"></i>';
    }
  }

  uploadBtn.disabled = false;
}

function resetFileSelection() {
  selectedFile = null;
  fileInput.value = '';
  
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }

  document.getElementById('promptContent').classList.remove('hidden');
  document.getElementById('fileInfo').classList.add('hidden');
  document.getElementById('previewContainer').classList.add('hidden');
  document.getElementById('pageSelectionSection').classList.add('hidden');
  document.getElementById('pdfPreviewFrame').src = '';
  
  uploadBtn.disabled = true;
}

async function submitUpload() {
  if (!selectedFile) return;

  const printOption = document.querySelector('input[name="printRangeType"]:checked').value;
  const customPageInput = document.getElementById('customPageCount').value;

  if (printOption === 'custom' && (!customPageInput || parseInt(customPageInput, 10) <= 0)) {
    alert('Please enter a valid page count.');
    return;
  }

  const formData = new FormData();
  formData.append('document', selectedFile);
  formData.append('printOption', printOption);
  if (printOption === 'custom') {
    formData.append('customPageCount', customPageInput);
  }

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();

    if (result.success) {
      document.getElementById('uploadCard').classList.add('hidden');
      document.getElementById('successCard').classList.remove('hidden');
      
      document.getElementById('ticketCode').innerText = result.data.referenceNumber;
      document.getElementById('resFileName').innerText = result.data.originalFileName;
      document.getElementById('resPageCount').innerText = `${result.data.pageCount} Page(s)`;
    } else {
      alert(result.message || 'Upload failed');
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `<i class="fa-solid fa-paper-plane text-delle-gold"></i><span>Generate Print Queue Code</span>`;
    }
  } catch (err) {
    alert('Connection error. Please try again.');
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = `<i class="fa-solid fa-paper-plane text-delle-gold"></i><span>Generate Print Queue Code</span>`;
  }
}