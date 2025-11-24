let variantCount = 0;
let variantsData = {}; 
let currentCropper = null;
let currentCropCallback = null;

// Initialize first variant
const firstVariantId = `variant-${variantCount}`;
variantsData[firstVariantId] = { mainImage: null, subImages: [] };

// ================== FIRST VARIANT HANDLERS ==================
function handleMainImageChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  openCropModal(file, (croppedFile) => {
    variantsData[firstVariantId].mainImage = croppedFile;
    updateMainImagePreview(croppedFile, "mainImagePreview", firstVariantId);
  });
}

function handleSubImagesUpload(input) {
  const files = Array.from(input.files);
  if (files.length + variantsData[firstVariantId].subImages.length > 3) {
    Swal.fire("Limit Exceeded", "You can only upload exactly 3 images.", "error");
    input.value = "";
    return;
  }

  files.forEach((file) => {
    openCropModal(file, (croppedFile) => {
      variantsData[firstVariantId].subImages.push(croppedFile);
      updateSubImagesPreview("subImagesPreview", "currentImageCount", firstVariantId);
    });
  });

  input.value = "";
}

function clearAllSubImages() {
  variantsData[firstVariantId].subImages = [];
  document.getElementById("subImagesInput").value = "";
  updateSubImagesPreview("subImagesPreview", "currentImageCount", firstVariantId);
}

// ================== DYNAMIC VARIANT HANDLERS ==================
function addVariant() {
  variantCount++;
  const variantId = `variant-${variantCount}`;
  variantsData[variantId] = { mainImage: null, subImages: [] };

  const container = document.getElementById("variantsContainer");
const variantHTML = `
<div id="${variantId}" class="variant-item bg-white border border-gray-200 rounded-lg shadow-lg p-6 mb-6">

  <!-- Header -->
  <div class="flex justify-between items-center mb-4">
    <h4 class="text-md font-medium text-gray-700">Variant ${variantCount + 1}</h4>
    <button type="button" onclick="removeVariant('${variantId}')" class="text-red-500 hover:text-red-700">✕</button>
  </div>

  <!-- Variant Fields -->
  <div class="grid grid-cols-3 gap-4 mb-6">
    <div>
      <label class="block text-gray-600 mb-1">Volume*</label>
      <select class="variant-volume w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        <option value="">Select volume</option>
        <option value="100">100 ml</option>
        <option value="250">250 ml</option>
        <option value="500">500 ml</option>
        <option value="750">750 ml</option>
        <option value="1000">1000 ml</option>
      </select>
      <span class="errorVariantVolume text-red-500 text-sm"></span>
    </div>
    <div>
      <label class="block text-gray-600 mb-1">Price*</label>
      <input type="number" class="variant-price w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter price" step="1">
      <span class="errorVariantPrice text-red-500 text-sm"></span>
    </div>
    <div>
      <label class="block text-gray-600 mb-1">Quantity*</label>
      <input type="number" class="variant-stock w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter quantity" min="0">
      <span class="errorVariantStock text-red-500 text-sm"></span>
    </div>
  </div>

       <!-- Product Images -->
      <div>
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Product Images</h3>

       <!-- Main Image -->
<div class="mb-4">
  <label class="block text-gray-600 mb-2">Main Image*</label>
  <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer"
       onclick="document.getElementById('${variantId}-mainImageInput').click()">
    <div class="flex flex-col items-center">
      <span class="material-icons text-gray-400 text-2xl mb-2">upload</span>
      <p class="text-gray-600 text-sm">Click to upload main image</p>
    </div>
    <input type="file" id="${variantId}-mainImageInput" class="hidden"
           accept="image/*" onchange="handleVariantMainImage(event, '${variantId}')">
    <div id="${variantId}-mainImagePreview" class="mt-2"></div>
    <span id="${variantId}-errorMainImage" class="text-red-500 text-sm"></span>
  </div>
</div>

   <!-- Sub Images -->
   <div class="mb-4">
     <label class="block text-gray-600 mb-2">Additional Images (Exactly 3 Required)*</label>
     <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer"
          onclick="document.getElementById('${variantId}-subImagesInput').click()">
       <div class="flex flex-col items-center">
         <span class="material-icons text-gray-400 text-2xl mb-2">upload</span>
         <p class="text-gray-600 text-sm">Click to upload additional images</p>
          <span id="${variantId}-errorSubImages" class="text-red-500 text-sm block mt-1"></span>
       </div>
       <input type="file" id="${variantId}-subImagesInput" class="hidden"
              multiple accept="image/*" onchange="handleVariantSubImages(event, '${variantId}')">
       <div id="${variantId}-subImagesPreview" class="flex flex-wrap gap-2 mt-3"></div>
       <div class="flex justify-between items-center mt-2">
         <span class="text-xs text-gray-500">Current: 
           <span id="${variantId}-currentImageCount">0</span>/3
         </span>
         <button type="button" onclick="clearVariantSubImages('${variantId}')"
                 class="text-xs text-red-500 hover:text-red-700">Clear All</button>
       </div>
     </div>
    
   </div>

      </div>
  </div>
</div>
`;


  container.insertAdjacentHTML("beforeend", variantHTML);
}

function removeVariant(variantId) {
  document.getElementById(variantId).remove();
  delete variantsData[variantId];
}

// ================== IMAGE UPLOAD & CROP ==================
function handleVariantMainImage(event, variantId) {
  const file = event.target.files[0];
  if (!file) return;

  openCropModal(file, (croppedFile) => {
    // Save cropped file
    variantsData[variantId].mainImage = croppedFile;

    updateMainImagePreview(
      croppedFile,
      `${variantId}-mainImagePreview`,
      variantId
    );

    //  Clear error after successful upload
    const errorElement = document.getElementById(`${variantId}-errorMainImage`);
    if (errorElement) errorElement.textContent = "";
  });
}

function handleVariantSubImages(event, variantId) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  if (files.length + variantsData[variantId].subImages.length > 3) {
    Swal.fire(
      "Limit Exceeded",
      "You can only upload exactly 3 images.",
      "error"
    );
    event.target.value = "";
    return;
  }

  files.forEach((file) => {
    openCropModal(file, (croppedFile) => {
      // Save cropped file
      variantsData[variantId].subImages.push(croppedFile);

      // Update preview
      updateSubImagesPreview(
        `${variantId}-subImagesPreview`,
        `${variantId}-currentImageCount`,
        variantId
      );

      //  Clear error only when they have exactly 3 images
      const errorElement = document.getElementById(`${variantId}-errorSubImages`);
      if (errorElement && variantsData[variantId].subImages.length === 3) {
        errorElement.textContent = "";
      }
    });
  });

  event.target.value = "";
}

function updateMainImagePreview(file, previewId, variantId) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const container = document.getElementById(previewId);
    container.innerHTML = `
      <div class="relative w-32 h-32 border rounded-lg overflow-hidden">
        <img src="${e.target.result}" class="object-cover w-full h-full cursor-pointer"
             onclick="showImagePreview('${e.target.result}')"/>
        <button type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
          onclick="clearMainImage('${variantId}', '${previewId}')">✕</button>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function clearMainImage(variantId, previewId) {
  variantsData[variantId].mainImage = null;
  const inputId = variantId === firstVariantId ? "mainImageInput" : `${variantId}-mainImageInput`;
  document.getElementById(inputId).value = "";
  document.getElementById(previewId).innerHTML = "";
}

function updateSubImagesPreview(containerId, countId, variantId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  variantsData[variantId].subImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement("div");
      div.className = "relative w-24 h-24 border rounded-lg overflow-hidden";
      div.innerHTML = `
        <img src="${e.target.result}" class="object-cover w-full h-full cursor-pointer"
             onclick="showImagePreview('${e.target.result}')"/>
        <button type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
          onclick="removeSubImage('${variantId}', ${index}, '${containerId}', '${countId}')">✕</button>
      `;
      container.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  document.getElementById(countId).textContent = variantsData[variantId].subImages.length;
}

function removeSubImage(variantId, index, containerId, countId) {
  variantsData[variantId].subImages.splice(index, 1);
  updateSubImagesPreview(containerId, countId, variantId);
}

function clearVariantSubImages(variantId) {
  variantsData[variantId].subImages = [];
  const inputId = `${variantId}-subImagesInput`;
  document.getElementById(inputId).value = "";
  updateSubImagesPreview(`${variantId}-subImagesPreview`, `${variantId}-currentImageCount`, variantId);
}

// ================== UNIVERSAL PREVIEW ==================
function showImagePreview(imageUrl) {
  Swal.fire({ imageUrl, showCloseButton: true, showConfirmButton: false, width: "auto" });
}

// ================== CROP MODAL ==================
function openCropModal(imageFile, callback) {
  const modal = document.getElementById('cropModal');
  const cropImage = document.getElementById('cropImage');

  const reader = new FileReader();
  reader.onload = function(e) {
    cropImage.src = e.target.result;
    modal.classList.remove('hidden');

    if (currentCropper) currentCropper.destroy();
    currentCropper = new Cropper(cropImage, { aspectRatio: 1, viewMode: 1, autoCropArea: 1, dragMode: 'move', cropBoxResizable: true });
    currentCropCallback = callback;
  };
  reader.readAsDataURL(imageFile);
}

function closeCropModal() {
  const modal = document.getElementById('cropModal');
  modal.classList.add('hidden');
  if (currentCropper) currentCropper.destroy();
  currentCropper = null;
  currentCropCallback = null;
}

function cropAndSave() {
  if (currentCropper && currentCropCallback) {
    currentCropper.getCroppedCanvas({ width: 800, height: 800 }).toBlob((blob) => {
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      currentCropCallback(file);
      closeCropModal();
    }, 'image/jpeg', 0.9);
  }
}




///////////////////////////////////////////////////axios form submission///////////////////////////////////////////////////////
const form = document.getElementById("addProductForm");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  let isValid = true;

   // Reset error messages
   document.querySelectorAll("span[id^='error']").forEach(s => s.textContent = "");
   document.querySelectorAll(".errorVariantVolume, .errorVariantPrice, .errorVariantStock").forEach(s => s.textContent = "");

   // ================== BASIC FIELDS ==================
   const name = document.getElementById("productName").value.trim();
   const brand = document.getElementById("productBrand").value;
   const category = document.getElementById("productCategory").value;
   const description = document.getElementById("productDescription").value.trim();

   if (!name) {
     document.getElementById("errorName").textContent = "Product name is required";
     isValid = false;
   } else if (name.length < 3) {
     document.getElementById("errorName").textContent = "Name must be at least 3 letters";
     isValid = false;
   }else if (name.length > 15) {
  document.getElementById("errorName").textContent = "Name cannot exceed 15 characters";
  isValid = false;
}


   if (!brand) {
     document.getElementById("errorBrand").textContent = "Brand is required";
     isValid = false;
   }

   if (!category) {
     document.getElementById("errorCategory").textContent = "Category is required";
     isValid = false;
   }

   if (!description) {
     document.getElementById("errorDescription").textContent = "Description is required";
     isValid = false;
   } else if (description.length < 10) {
     document.getElementById("errorDescription").textContent = "Description must be at least 10 letters";
     isValid = false;
   }


   if (!variantsData[firstVariantId].mainImage) {
     document.getElementById("errorMainImage").textContent = "Main image is required";
     isValid = false;
   }

   if (variantsData[firstVariantId].subImages.length !== 3) {
     document.getElementById("errorSubImages").textContent = "You must upload exactly 3 images";
     isValid = false;
   }

   document.querySelectorAll("#variantsContainer .variant-item").forEach((item, index) => {
     const variantId = item.id;
     const volume = item.querySelector(".variant-volume").value;
     const price = item.querySelector(".variant-price").value;
     const stock = item.querySelector(".variant-stock").value;

     // Validate variant fields
     if (!volume) {
       item.querySelector(".errorVariantVolume").textContent = "Volume is required";
       isValid = false;
     }
     if (!price || price <= 0) {
       item.querySelector(".errorVariantPrice").textContent = "Price must be positive";
       isValid = false;
     }
     if (!stock || stock < 0) {
       item.querySelector(".errorVariantStock").textContent = "Quantity must be positive";
       isValid = false;
     }

     // Validate variant images
     if (!variantsData[variantId] || !variantsData[variantId].mainImage) {
       const errorElement = document.getElementById(`${variantId}-errorMainImage`);
       if (errorElement) {
         errorElement.textContent = "Main image is required";
         isValid = false;
       }
     }

     if (!variantsData[variantId] || variantsData[variantId].subImages.length !== 3) {
       const errorElement = document.getElementById(`${variantId}-errorSubImages`);
       if (errorElement) {
         errorElement.textContent = "You must upload exactly 3 images";
         isValid = false;
       }
     }
   });

 
  if (!isValid) return;

  // ================== BUILD FORM DATA ==================>>>>>>>>>>
  const formData = new FormData();
  formData.append("name", name);
  formData.append("brand", brand);
  formData.append("category", category);
  formData.append("description", description);

  const variantsArray = [];
  document.querySelectorAll("#variantsContainer .variant-item").forEach((item) => {
const volume = item.querySelector(".variant-volume").value;
const price = item.querySelector(".variant-price").value;
const stock = item.querySelector(".variant-stock").value;

// Convert to numbers
const volNum = Number(volume);
const priceNum = Number(price);
const stockNum = Number(stock);

// Validation for negative values
if (volNum < 0 || priceNum < 0 || stockNum < 0) {
  Toast.fire({
    icon: "error",
    title: "Volume, Price & Stock cannot be negative!"
  });
  return; // stop form submit
}


    variantsArray.push({ volume, price, stock });
  });
  formData.append("variantsData", JSON.stringify(variantsArray));

  // Images
  Object.keys(variantsData).forEach((variantId, index) => {
    const variant = variantsData[variantId];

    if (variant.mainImage) {
      formData.append(`variantMainImage_${index}`, variant.mainImage);
    }

    variant.subImages.forEach((file, subIndex) => {
      formData.append(`variantSubImages_${index}_${subIndex}`, file);
    });
  });

  // ================== SUBMIT FORM ==================
  try {
    const res = await axios.post("/admin/addProduct", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
console.log("Server Response:", res.data);

    if (res.data.success) {
      Swal.fire("Success", "Product added successfully", "success").then(() => {
        window.location.href = "/admin/products";
      });
    } else {
      Swal.fire("Error", res.data.message, "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Error adding product", "error");
  }
});
