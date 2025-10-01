// ================= GLOBAL VARIABLES =================
let mainImageFile = null;
let subImageFiles = []; // array of {file: File, index: number}
let currentCropper = null;
let currentCropCallback = null;
let currentEditingSubIndex = null;






// ================= UPDATE SUB IMAGES PREVIEW =================
function updateSubImagesPreview() {
  const container = document.getElementById("editSubImagesPreview");
  container.innerHTML = "";
  subImageFiles.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "relative w-20 h-20 border rounded-lg overflow-hidden";
    const imgEl = document.createElement("img");
    imgEl.src = item.file ? URL.createObjectURL(item.file) : item.url;
    imgEl.className = "object-cover w-full h-full cursor-pointer";
    imgEl.title = "Click to edit";
    imgEl.addEventListener("click", () => editSubImage(idx));

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs";
    btn.innerText = "✕";
    btn.addEventListener("click", () => {
      subImageFiles.splice(idx, 1);
      updateSubImagesPreview();
    });

    div.appendChild(imgEl);
    div.appendChild(btn);
    container.appendChild(div);
  });
}

// ================= CROP MODAL =================
function openCropModal(file, callback) {
  const modal = document.getElementById("cropModal");
  const cropImage = document.getElementById("cropImage");
  const reader = new FileReader();

  reader.onload = function(e) {
    cropImage.src = e.target.result;
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    if (currentCropper) currentCropper.destroy();

    currentCropper = new Cropper(cropImage, {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 1
    });

    currentCropCallback = callback;
  };
  reader.readAsDataURL(file);
}

function closeCropModal() {
  const modal = document.getElementById("cropModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  if (currentCropper) {
    currentCropper.destroy();
    currentCropper = null;
  }
  currentCropCallback = null;
}

function cropAndSave() {
  if (!currentCropper || !currentCropCallback) return;

  currentCropper.getCroppedCanvas({
    width: 800,
    height: 800,
  }).toBlob((blob) => {
    const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" });
    currentCropCallback(croppedFile);
    closeCropModal();
  }, "image/jpeg", 0.9);
}








//////////////////////////////////////block/unblock////////////////////////////////////////////////

async function confirmToggleBlock(productId, isBlocked) {
    const result = await Swal.fire({
        title: isBlocked ? 'Unblock product?' : 'Block product?',
        text: isBlocked ? 'This product will be visible to users.' : 'This product will be hidden from users.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: isBlocked ? 'Yes, unblock' : 'Yes, block',
        cancelButtonText: 'Cancel'
    });
    if (result.isConfirmed) {
        try {
            const resp = await fetch(`/admin/products/${productId}/toggle-block`, { method: 'PATCH' });
            const data = await resp.json();
            if (data && data.success) {
                await Swal.fire('Success', data.message || 'Updated', 'success');
                window.location.reload();
            } else {
                Swal.fire('Error', (data && data.message) || 'Failed to update', 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Network error', 'error');
        }
    }
}
window.confirmToggleBlock = confirmToggleBlock;






 