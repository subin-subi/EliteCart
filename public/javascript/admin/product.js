function openAddProductModal() {
        document.getElementById("addProductModal").classList.remove("hidden");
      }
  
      function closeAddProductModal() {
        document.getElementById("addProductModal").classList.add("hidden");
        document.getElementById("addProductForm").reset();
        const mainPreview = document.getElementById("mainImagePreview");
        if (mainPreview) mainPreview.innerHTML = "";
        const subPreview = document.getElementById("subImagesPreview");
        if (subPreview) subPreview.innerHTML = "";
        const countEl = document.getElementById("currentImageCount");
        if (countEl) countEl.textContent = "0";
        // reset internal state for sub images
        collectedSubFiles = [];
        pendingSubFilesQueue = [];
      }

// Cropper state
let cropperInstance = null;
let currentCropTarget = null; // 'main' | 'sub'
let pendingSubFilesQueue = [];
let collectedSubFiles = [];

function openCropModal(imageSrc, target) {
    const modal = document.getElementById("cropModal");
    const img = document.getElementById("cropImage");
    currentCropTarget = target;
    img.src = imageSrc;
    modal.classList.remove("hidden");
    setTimeout(() => {
        if (cropperInstance) {
            cropperInstance.destroy();
        }
        cropperInstance = new Cropper(img, {
            viewMode: 1,
            aspectRatio: 1,
            movable: true,
            zoomable: true,
            scalable: true,
            rotatable: false,
            background: false,
        });
    }, 0);
}

function closeCropModal() {
    const modal = document.getElementById("cropModal");
    modal.classList.add("hidden");
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    currentCropTarget = null;
}

function blobToFile(blob, fileName) {
    return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

function updateMainPreview(url) {
    const container = document.getElementById("mainImagePreview");
    if (!container) return;
    container.innerHTML = `<img src="${url}" class="h-24 w-24 object-cover rounded-lg"/>`;
}

function updateSubPreview(urls) {
    const container = document.getElementById("subImagesPreview");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 3; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'h-20 w-20 rounded border flex items-center justify-center overflow-hidden bg-gray-50';
        if (urls[i]) {
            const el = document.createElement('img');
            el.src = urls[i];
            el.className = 'h-full w-full object-cover';
            wrapper.appendChild(el);
        } else {
            const span = document.createElement('span');
            span.className = 'text-xs text-gray-400';
            span.textContent = `Slot ${i+1}`;
            wrapper.appendChild(span);
        }
        container.appendChild(wrapper);
    }
    const countEl = document.getElementById("currentImageCount");
    if (countEl) countEl.textContent = String(urls.length);
}

async function handleMainImageChange(evt) {
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        openCropModal(reader.result, 'main');
    };
    reader.readAsDataURL(file);
}

function processNextSubCrop() {
    if (pendingSubFilesQueue.length === 0) {
        const input = document.getElementById("subImagesInput");
        const dt = new DataTransfer();
        collectedSubFiles.forEach(f => dt.items.add(f));
        input.files = dt.files;
        updateSubPreview(collectedSubFiles.map(f => URL.createObjectURL(f)));
        return;
    }
    const nextFile = pendingSubFilesQueue.shift();
    const reader = new FileReader();
    reader.onload = () => {
        openCropModal(reader.result, 'sub');
    };
    reader.readAsDataURL(nextFile);
}

async function handleSubImagesUpload(inputEl) {
    const files = Array.from(inputEl.files || []);
    if (files.length === 0) return;
    const remaining = Math.max(0, 3 - collectedSubFiles.length);
    if (remaining === 0) {
        alert('You already selected 3 sub images.');
        return;
    }
    pendingSubFilesQueue = files.slice(0, remaining);
    processNextSubCrop();
}

function clearAllSubImages() {
    const input = document.getElementById("subImagesInput");
    const dt = new DataTransfer();
    input.files = dt.files;
    collectedSubFiles = [];
    pendingSubFilesQueue = [];
    updateSubPreview([]);
}

function cropAndSave() {
    if (!cropperInstance || !currentCropTarget) return;
    cropperInstance.getCroppedCanvas({ width: 800, height: 800 }).toBlob(blob => {
        if (!blob) return;
        if (currentCropTarget === 'main') {
            const file = blobToFile(blob, 'main.jpg');
            const dt = new DataTransfer();
            dt.items.add(file);
            document.getElementById('mainImageInput').files = dt.files;
            updateMainPreview(URL.createObjectURL(file));
            closeCropModal();
        } else if (currentCropTarget === 'sub') {
            const file = blobToFile(blob, `sub_${Date.now()}.jpg`);
            if (collectedSubFiles.length < 3) {
                collectedSubFiles.push(file);
            }
            closeCropModal();
            processNextSubCrop();
        }
    }, 'image/jpeg', 0.92);
}

// expose to window for inline handlers
window.handleMainImageChange = handleMainImageChange;
window.handleSubImagesUpload = handleSubImagesUpload;
window.clearAllSubImages = clearAllSubImages;
window.cropAndSave = cropAndSave;
window.closeCropModal = closeCropModal;

function validateImageCounts() {
    const mainFiles = document.getElementById('mainImageInput').files;
    const subFiles = document.getElementById('subImagesInput').files;
    if (!mainFiles || mainFiles.length !== 1) {
        alert('Please select one main image.');
        return false;
    }
    if (!subFiles || subFiles.length !== 3) {
        alert('Please select exactly 3 sub images.');
        return false;
    }
    return true;
}
window.validateImageCounts = validateImageCounts;