let mainImageFile = null;
let subImageFiles = [];

let currentCropper = null;
let currentCropCallback = null;

// ========== MAIN IMAGE UPLOAD ==========
function handleMainImageChange(event) {
  const file = event.target.files[0];
  if (file) {
    openCropModal(file, (croppedFile) => {
      mainImageFile = croppedFile;
      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("mainImagePreview").innerHTML = `
          <div class="relative w-32 h-32 border rounded-lg overflow-hidden">
            <img src="${e.target.result}" 
                 class="object-cover w-full h-full cursor-pointer" 
                 onclick="showImagePreview('${e.target.result}')"/>
            <button type="button" 
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                    onclick="clearMainImage()">
              ✕
            </button>
          </div>
        `;
      };
      reader.readAsDataURL(croppedFile);
    });
  }
}

function clearMainImage() {
  mainImageFile = null;
  document.getElementById("mainImageInput").value = "";
  document.getElementById("mainImagePreview").innerHTML = "";
}

// ========== SUB IMAGES UPLOAD ==========
function handleSubImagesUpload(input) {
  const files = Array.from(input.files);

  if (files.length + subImageFiles.length > 3) {
    Swal.fire("Limit Exceeded", "You can only upload exactly 3 images.", "error");
    input.value = "";
    return;
  }

  // Crop each selected file
  files.forEach((file) => {
    openCropModal(file, (croppedFile) => {
      subImageFiles.push(croppedFile);
      updateSubImagesPreview();
    });
  });

  input.value = "";
}

function updateSubImagesPreview() {
  const previewContainer = document.getElementById("subImagesPreview");
  previewContainer.innerHTML = "";

  subImageFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const div = document.createElement("div");
      div.className = "relative w-24 h-24 border rounded-lg overflow-hidden";
      div.innerHTML = `
        <img src="${e.target.result}" 
             class="object-cover w-full h-full cursor-pointer"
             onclick="showImagePreview('${e.target.result}')">
        <button type="button" 
                class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                onclick="removeSubImage(${index})">
          ✕
        </button>
      `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  updateImageCount();
}

function removeSubImage(index) {
  subImageFiles.splice(index, 1);
  updateSubImagesPreview();
}

function clearAllSubImages() {
  subImageFiles = [];
  document.getElementById("subImagesInput").value = "";
  updateSubImagesPreview();
}

function updateImageCount() {
  document.getElementById("currentImageCount").textContent = subImageFiles.length;
}

// ========== UNIVERSAL PREVIEW ==========
function showImagePreview(imageUrl) {
  Swal.fire({
    imageUrl: imageUrl,
    imageAlt: "Preview",
    showCloseButton: true,
    showConfirmButton: false,
    width: "auto"
  });
}

// ========== CROPPER ==========
function openCropModal(imageFile, callback) {
  const modal = document.getElementById('cropModal');
  const cropImage = document.getElementById('cropImage');

  const reader = new FileReader();
  reader.onload = function (e) {
    cropImage.src = e.target.result;
    modal.classList.remove('hidden');

    if (currentCropper) {
      currentCropper.destroy();
    }

    currentCropper = new Cropper(cropImage, {
      aspectRatio: 1,   // square crop
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 1,
      guides: true,
      center: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    });

    currentCropCallback = callback;
  };
  reader.readAsDataURL(imageFile);
}

function closeCropModal() {
  const modal = document.getElementById('cropModal');
  modal.classList.add('hidden');
  if (currentCropper) {
    currentCropper.destroy();
    currentCropper = null;
  }
  currentCropCallback = null;
}

function cropAndSave() {
  if (currentCropper && currentCropCallback) {
    const canvas = currentCropper.getCroppedCanvas({
      width: 800,
      height: 800,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    canvas.toBlob(function (blob) {
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      currentCropCallback(file);
      closeCropModal();
    }, 'image/jpeg', 0.9);
  }
}




///////////////////////////////////////////////////axios form submission///////////////////////////////////////////////////////
const form = document.getElementById('addProductForm');

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData();

  // Reset error messages
  document.querySelectorAll("span[id^='error']").forEach(s => s.textContent = "");
  document.querySelectorAll(".errorVariantVolume, .errorVariantPrice, .errorVariantStock").forEach(s => s.textContent = "");

  let isValid = true;

  const name = document.getElementById("productName").value.trim();
  const brand = document.getElementById("productBrand").value;
  const category = document.getElementById("productCategory").value;
  const description = document.getElementById("productDescription").value.trim();

  // Name validation
  if (!name) {
    document.getElementById("errorName").textContent = "Name is required";
    isValid = false;
  } else if (!/^[A-Za-z\s]+$/.test(name)) {
    document.getElementById("errorName").textContent = "Name can only contain letters";
    isValid = false;
  } else if (name.length < 3) {
    document.getElementById("errorName").textContent = "Name must be at least 3 letters";
    isValid = false;
  }

  // Brand validation
  if (!brand) {
    document.getElementById("errorBrand").textContent = "Brand is required";
    isValid = false;
  }

  // Category validation
  if (!category) {
    document.getElementById("errorCategory").textContent = "Category is required";
    isValid = false;
  }

  // Description validation
  if (!description) {
    document.getElementById("errorDescription").textContent = "Description is required";
    isValid = false;
  } else if (description.length < 10) {
    document.getElementById("errorDescription").textContent = "Description must be at least 10 letters";
    isValid = false;
  }

  // Main image validation
  if (!mainImageFile) {
    document.getElementById("errorMainImage").textContent = "Main image is required";
    isValid = false;
  }

  // Sub images validation
  if (subImageFiles.length !== 3) {
    document.getElementById("errorSubImages").textContent = "You must upload exactly 3 images";
    isValid = false;
  }

  // Variants validation
  document.querySelectorAll("#variantsContainer .variant-item").forEach((item, index) => {
    const volume = item.querySelector(".variant-volume").value;
    const price = item.querySelector(".variant-price").value;
    const stock = item.querySelector(".variant-stock").value;

    if (!volume) {
      item.querySelector(".errorVariantVolume").textContent = "Volume is required";
      isValid = false;
    }
    if (!price || price <= 0) {
      item.querySelector(".errorVariantPrice").textContent = "Price must be greater than 0";
      isValid = false;
    }
    if (!stock || stock < 0) {
      item.querySelector(".errorVariantStock").textContent = "Quantity must be 0 or more";
      isValid = false;
    }
  });

  if (!isValid) return; // stop submission if validation fails

  // Text fields
  formData.append("name", name);
  formData.append("brand", brand);
  formData.append("category", category);
  formData.append("description", description);

  // Variants
  const variants = [];
  document.querySelectorAll("#variantsContainer .variant-item").forEach((item) => {
    const volume = item.querySelector(".variant-volume").value;
    const price = item.querySelector(".variant-price").value;
    const stock = item.querySelector(".variant-stock").value;
    variants.push({ volume, price, stock });
  });
  formData.append("variantsData", JSON.stringify(variants));

  // Attach main image
  if (mainImageFile) {
    formData.append("mainImage", mainImageFile);
  }

  // Attach sub images
  subImageFiles.forEach((file) => {
    formData.append("subImages", file);
  });

  try {
    const res = await axios.post("/admin/addproduct", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    if (res.data.success) {
      alert("Product added successfully");
      window.location.reload();
    } else {
      alert("Error: " + res.data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Error adding product");
  }
});
