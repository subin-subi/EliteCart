///////////////////////////////////////// GLOBAL VARIABLES ////////////////////////////////////////

let currentCropper = null;
let currentCropCallback = null;

// Store cropped files per variant
const croppedFiles = {};
// Structure: croppedFiles[variantId] = { mainImage: File, subImages: [File, File...] }

///////////////////////////////////////// CROP MODAL /////////////////////////////////////////////

function openCropModal(file, callback) {
  const modal = document.getElementById("cropModal");
  const cropImage = document.getElementById("cropImage");
  const reader = new FileReader();

  reader.onload = function (e) {
    cropImage.src = e.target.result;
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    if (currentCropper) currentCropper.destroy();

    currentCropper = new Cropper(cropImage, {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 1,
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

  currentCropper.getCroppedCanvas({ width: 800, height: 800 }).toBlob((blob) => {
    const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" });

    // Create base64 version for preview if needed
    const reader = new FileReader();
    reader.onloadend = function () {
      const base64 = reader.result; // for preview or hidden input if needed
      currentCropCallback(croppedFile, base64);
      closeCropModal();
    };
    reader.readAsDataURL(croppedFile);
  }, "image/jpeg", 0.9);
}

///////////////////////////////////////// MAIN IMAGE /////////////////////////////////////////////

function editMainImage(variantId) {
  const input = document.getElementById(`mainImageInput-${variantId}`);
  input.click();
}

function handleExistingMainImage(event, variantId) {
  const file = event.target.files[0];
  if (!file) return;

  openCropModal(file, (croppedFile, base64) => {
    // Replace image in UI
    const container = event.target.parentElement;
    container.querySelector("img")?.remove();

    const img = document.createElement("img");
    img.src = URL.createObjectURL(croppedFile);
    img.className = "w-32 h-32 object-cover rounded-lg cursor-pointer";
    img.onclick = () => editMainImage(variantId);

    container.prepend(img);

    // Store cropped file
    if (!croppedFiles[variantId]) croppedFiles[variantId] = { subImages: [] };
    croppedFiles[variantId].mainImage = croppedFile;
  });

  event.target.value = "";
}



function removeVariant(button) {
  const variantBlock = button.closest(".variant-row"); 
  if (!variantBlock) return;

  const variantId = variantBlock.getAttribute("data-variant-id");
  variantBlock.remove();

  if (variantId) {
    const form = document.getElementById("editProductForm");
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "removeVariants[]";
    hiddenInput.value = variantId;
    form.appendChild(hiddenInput);
  }

  // Remove from croppedFiles if exists
  if (croppedFiles[variantId]) delete croppedFiles[variantId];
}

// -------------------- HANDLE SUB-IMAGE EDITING --------------------
function editSubImage(variantId, subIndex) {
  const input = document.getElementById(`subImagesInput-${variantId}`);
  input.click();
  input.dataset.editIndex = subIndex;
}

function handleExistingSubImages(event, variantId) {
  const files = Array.from(event.target.files);
  const container = document.getElementById(`subImagesContainer-${variantId}`);
  const maxLimit = 3; // Max sub-images per variant

  files.forEach((file) => {
    if (!croppedFiles[variantId]) croppedFiles[variantId] = { subImages: [] };
    if (croppedFiles[variantId].subImages.length >= maxLimit) {
      alert(`You can only upload a maximum of ${maxLimit} sub-images.`);
      return;
    }

    openCropModal(file, (croppedFile) => {
      croppedFiles[variantId].subImages.push(croppedFile);

      const wrapper = document.createElement("div");
      wrapper.className = "relative w-20 h-20";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(croppedFile);
      img.className = "w-20 h-20 object-cover rounded-lg cursor-pointer";
      img.onclick = () => editSubImage(variantId, croppedFiles[variantId].subImages.length - 1);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerText = "✕";
      btn.className = "absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs";
      btn.onclick = () => {
        wrapper.remove();
        croppedFiles[variantId].subImages = croppedFiles[variantId].subImages.filter(f => f !== croppedFile);
      };

      wrapper.appendChild(img);
      wrapper.appendChild(btn);
      container.appendChild(wrapper);
    });
  });

  event.target.value = ""; // Reset input
}

// -------------------- REMOVE SUB-IMAGE --------------------
function removeSubImage(variantId, imageUrl) {
  const form = document.getElementById("editProductForm");

  // Add a hidden input to submit removed image paths to backend
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.name = "removeSubImages[]";
  hiddenInput.value = imageUrl;
  form.appendChild(hiddenInput);

  // Remove from DOM
  const imageWrapper = document.querySelector(`.subImageWrapper[data-variant="${variantId}"][data-url="${imageUrl}"]`);
  if (imageWrapper) {
    imageWrapper.remove();
  }

  // Remove from croppedFiles if exists
  if (croppedFiles[variantId]?.subImages) {
    croppedFiles[variantId].subImages = croppedFiles[variantId].subImages.filter(f => f.name !== imageUrl && f.url !== imageUrl);
  }
}

// -------------------- FORM SUBMISSION --------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("editProductForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData();

    // Append product fields
    formData.append("name", document.getElementById("productName").value);
    formData.append("brand", document.getElementById("productBrand").value);
    formData.append("category", document.getElementById("productCategory").value);
    formData.append("description", document.getElementById("productDescription").value);

    // Variants
    const variants = [];
    document.querySelectorAll(".variant-row").forEach((row, index) => {
      const variantId = row.getAttribute("data-variant-id");
      const volume = row.querySelector(`[name="variants[${index}][volume]"]`)?.value;
      const price = row.querySelector(`[name="variants[${index}][price]"]`)?.value;
      const stock = row.querySelector(`[name="variants[${index}][stock]"]`)?.value;

      variants.push({ index, volume, price, stock });

      // Append cropped main image
      if (croppedFiles[variantId]?.mainImage) {
        formData.append(`variants[${index}][mainImage]`, croppedFiles[variantId].mainImage);
      }

      // Append cropped sub-images
      if (croppedFiles[variantId]?.subImages?.length > 0) {
        croppedFiles[variantId].subImages.forEach(f =>
          formData.append(`variants[${index}][subImages]`, f)
        );
      }

      // Append new un-cropped files from input
      const mainInput = row.querySelector(`[name="variants[${index}][mainImage]"]`);
      if (mainInput?.files[0]) formData.append(`variants[${index}][mainImage]`, mainInput.files[0]);

      const subInput = row.querySelector(`[name="variants[${index}][subImages]"]`);
      if (subInput?.files) {
        Array.from(subInput.files).forEach(f => {
          formData.append(`variants[${index}][subImages]`, f);
        });
      }
    });

    // Append removed sub-images
    document.querySelectorAll('input[name="removeSubImages[]"]').forEach(input => {
      formData.append("removeSubImages[]", input.value);
    });

    // Append removed variants
    document.querySelectorAll('input[name="removeVariants[]"]').forEach(input => {
      formData.append("removeVariants[]", input.value);
    });

    // Send variants info as JSON
    formData.append("variants", JSON.stringify(variants));

    try {
      const response = await axios.post(form.action, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Product updated:", response.data);

      Swal.fire("Success", "Product updated successfully!", "success").then(() => {
        window.location.href = '/admin/products';
      });
    } catch (err) {
      console.error("Error updating product:", err);
      Swal.fire("Error", "Failed to update product", "error");
    }
  });
});



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// let variantCount = 0;
// let variantsData = {};
// ================== ADD VARIANT ==================
// function addVariant() {
//   variantCount++;
//   const variantId = `variant-${variantCount}`;
//   variantsData[variantId] = { mainImage: null, subImages: [] };

//   const container = document.getElementById("variantsContainer");
//   const variantHTML = `
//     <div id="${variantId}" class="variant-item bg-white border border-gray-200 rounded-lg shadow-lg p-6 mb-6">
//       <div class="flex justify-between items-center mb-4">
//         <h4 class="text-md font-medium text-gray-700">Variant ${variantCount}</h4>
//         <button type="button" onclick="removeVariant('${variantId}')" class="text-red-500 hover:text-red-700">✕</button>
//       </div>

//       <div class="grid grid-cols-3 gap-4 mb-6">
//         <div>
//           <label class="block text-gray-600 mb-1">Volume*</label>
//           <select name="variants[${variantCount}][volume]" class="w-full px-3 py-2 border rounded-lg">
//             <option value="">Select volume</option>
//             <option value="100">100 ml</option>
//             <option value="250">250 ml</option>
//             <option value="500">500 ml</option>
//             <option value="750">750 ml</option>
//             <option value="1000">1000 ml</option>
//           </select>
//         </div>
//         <div>
//           <label class="block text-gray-600 mb-1">Price*</label>
//           <input type="number" name="variants[${variantCount}][price]" class="w-full px-3 py-2 border rounded-lg">
//         </div>
//         <div>
//           <label class="block text-gray-600 mb-1">Quantity*</label>
//           <input type="number" name="variants[${variantCount}][stock]" class="w-full px-3 py-2 border rounded-lg" min="0">
//         </div>
//       </div>

//       <!-- Images -->
//       <div>
//         <h3 class="text-lg font-semibold text-gray-800 mb-4">Product Images</h3>
        
//         <!-- Main Image -->
//         <div class="mb-4">
//           <label class="block text-gray-600 mb-2">Main Image*</label>
//           <input type="file" id="mainImageInput-${variantId}" 
//                  accept="image/*" 
//                  onchange="handleVariantMainImage(event, '${variantId}', 'variants[${variantCount}][mainImage]')">
//           <div id="mainImagePreview-${variantId}" class="mt-2 flex flex-wrap gap-2"></div>
//         </div>

//         <!-- Sub Images -->
//         <div class="mb-4">
//           <label class="block text-gray-600 mb-2">Additional Images* (Max 3)</label>
//           <input type="file" id="subImagesInput-${variantId}" 
//                  multiple accept="image/*" 
//                  onchange="handleVariantSubImages(event, '${variantId}', 'variants[${variantCount}][subImages][]')">
//           <div id="subImagesPreview-${variantId}" class="flex flex-wrap gap-2 mt-3"></div>
//         </div>
//       </div>
//     </div>
//   `;

//   container.insertAdjacentHTML("beforeend", variantHTML);
// }

// function removeVariant(id) {
//   document.getElementById(id).remove();
// }