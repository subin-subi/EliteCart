// ================= GLOBAL VARIABLES =================
let mainImageFile = null;
let subImageFiles = []; // array of {file: File, index: number}
let currentCropper = null;
let currentCropCallback = null;
let currentEditingSubIndex = null;

// ================= EDIT PRODUCT =================
async function editProduct(productId) {
  try {
    const res = await fetch(`/admin/product/${productId}`);
    const product = await res.json();

    if (!product.success) {
      return Swal.fire("Error", "Product not found", "error");
    }

    const data = product.data;

    // Fill form fields
    document.getElementById("editProductId").value = data._id;
    document.getElementById("editProductName").value = data.name;
    document.getElementById("editProductCategory").value = data.category?._id || "";
    document.getElementById("editProductBrand").value = data.brand?._id || "";
    document.getElementById("editProductDescription").value = data.description || "";

    // Variant
    if (data.variants && data.variants.length > 0) {
      const variant = data.variants[0];
      document.getElementById("editProductVolume").value = variant.volume || "";
      document.getElementById("editProductStock").value = variant.stock || "";
      document.getElementById("editProductPrice").value = variant.price || "";

      // ===== MAIN IMAGE =====
      mainImageFile = null;
      const mainPreview = document.getElementById("editMainImagePreview");
      if (variant.mainImage) {
        mainPreview.src = variant.mainImage;
        mainPreview.classList.remove("hidden");
      } else {
        mainPreview.src = "";
        mainPreview.classList.add("hidden");
      }

      // ===== SUB IMAGES =====
      subImageFiles = [];
      if (variant.subImages && variant.subImages.length > 0) {
        variant.subImages.forEach((url, idx) => {
          subImageFiles.push({ file: null, index: idx, url }); // file=null means existing image
        });
      }
      updateSubImagesPreview();
    }

    // Show modal
    const editModal = document.getElementById("editProductModal");
    editModal.classList.remove("hidden");
    editModal.classList.add("flex");

  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Something went wrong", "error");
  }
}

// ================= MAIN IMAGE HANDLER =================
document.getElementById("editMainImage").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  openCropModal(file, (croppedFile) => {
    mainImageFile = croppedFile;
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById("editMainImagePreview");
      preview.src = e.target.result;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(croppedFile);
  });
});

// ================= SUB IMAGE INDIVIDUAL EDIT =================
function editSubImage(idx) {
  const existing = subImageFiles[idx];
  if (existing.file) {
    // already has a new file, we can crop it again
    openCropModal(existing.file, (croppedFile) => {
      subImageFiles[idx].file = croppedFile;
      updateSubImagesPreview();
    });
  } else {
    // fetch from existing url
    fetch(existing.url)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `sub_${idx}.jpg`, { type: "image/jpeg" });
        openCropModal(file, (croppedFile) => {
          subImageFiles[idx].file = croppedFile;
          subImageFiles[idx].url = null; // remove old url
          updateSubImagesPreview();
        });
      });
  }
}

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

// ================= FORM SUBMISSION =================
document.getElementById("editProductForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append("productId", document.getElementById("editProductId").value);
  formData.append("name", document.getElementById("editProductName").value);
  formData.append("category", document.getElementById("editProductCategory").value);
  formData.append("brand", document.getElementById("editProductBrand").value);
  formData.append("description", document.getElementById("editProductDescription").value);
  formData.append("variants[0][volume]", document.getElementById("editProductVolume").value);
  formData.append("variants[0][stock]", document.getElementById("editProductStock").value);
  formData.append("variants[0][price]", document.getElementById("editProductPrice").value);

  if (mainImageFile) formData.append("mainImage", mainImageFile);
  subImageFiles.forEach((item, index) => {
    if (item.file) {
      formData.append(`subImages[${index}]`, item.file);
    } else if (item.url) {
      formData.append(`existingSubImages[${index}]`, item.url);
    }
  });

  try {
    const res = await fetch(`/admin/products/${formData.get("productId")}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      Swal.fire("Success", data.message, "success").then(() => {
        closeEditProductModal();
        window.location.reload();
      });
    } else {
      Swal.fire("Error", data.message || "Failed to update product", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Something went wrong!", "error");
  }
});

// ================= ADD NEW SUB IMAGES (with crop) =================
document.getElementById("editSubImages").addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  let queue = files.slice();
  const processNext = () => {
    const next = queue.shift();
    if (!next) {
      updateSubImagesPreview();
      e.target.value = ""; // reset input
      return;
    }
    openCropModal(next, (cropped) => {
      subImageFiles.push({ file: cropped, index: subImageFiles.length, url: null });
      processNext();
    });
  };
  processNext();
});







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






 

//////////////////////////////////////searching////////////////////////////////////////////////
  
  const searchInput = document.getElementById('searchProduct');
  const tableBody = document.querySelector('table tbody');
  let debounceTimer;
  searchInput && searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const resp = await fetch(`/admin/api/products?search=${encodeURIComponent(q)}`);
        const data = await resp.json();
        if (!data.success) return;
        const rows = (data.products || []).map(p => `
          <tr class="hover:bg-gray-50 transition">
            <td class="px-6 py-4 whitespace-nowrap">
             <div class="flex-shrink-0 h-16 w-16">
              ${p.variants && p.variants.length > 0 && p.variants[0].mainImage
                ? `<img class="h-16 w-16 rounded-lg object-cover" src="${p.variants[0].mainImage}" alt="${p.name}">`
                : `<div class="h-16 w-16 rounded-lg bg-gray-200"></div>`}
            </div>

            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">${p.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">${p.category?.name || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">${p.brand?.name || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">₹${p.price}</div></td>
            <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${p.stock}</div></td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${p.status || 'active'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${p.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">${p.isBlocked ? 'blocked' : 'active'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center space-x-2">
                <button onclick="editProduct('${p._id}')" class="text-blue-500 hover:text-blue-700 hover:underline text-sm">Edit</button>
                <button onclick="confirmToggleBlock('${p._id}', ${!!p.isBlocked})" class="text-red-500 hover:text-red-700 hover:underline text-sm">${p.isBlocked ? 'Unblock' : 'Block'}</button>
              </div>
            </td>
          </tr>`).join('');
        tableBody.innerHTML = rows || '';
      } catch (_) {}
    }, 200);
    window.addEventListener("load", () => {
  const searchInput = document.getElementById("searchProduct");
  if (searchInput) searchInput.value = ""; 
});

  });


function closeEditProductModal() {
  const editModal = document.getElementById("editProductModal");
  editModal.classList.add("hidden");
  editModal.classList.remove("flex");
}

