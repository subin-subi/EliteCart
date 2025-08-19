
  const searchInput = document.getElementById("searchProduct");
  const clearBtn = document.getElementById("clearSearchBtn");

  // Show "X" only when input has text
  searchInput.addEventListener("input", () => {
    clearBtn.style.display = searchInput.value ? "block" : "none";
  });

  // Clear input when "X" is clicked
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";

    // Option 1: Just clear text (user can retype)
    // ❌ No page reload

    // Option 2: Reset form & reload product list
    document.getElementById("searchFilterForm").submit();
  });

  // On page load, decide if "X" should be visible
  window.addEventListener("load", () => {
    clearBtn.style.display = searchInput.value ? "block" : "none";
  });






// ----------------- STATE -----------------
    let variantCount = 0;
    let variantImages = {};

    // ----------------- MODAL -----------------
    function openAddProductModal() {
      document.getElementById("addProductModal").classList.remove("hidden");
    }

    function closeAddProductModal() {
      document.getElementById("addProductModal").classList.add("hidden");
      document.getElementById("addProductForm").reset();
      document.getElementById("variantsContainer").innerHTML = "";
      variantCount = 0;
      variantImages = {};
    }

    // ----------------- ADD VARIANT -----------------
    function addVariant() {
      variantCount++;
      const variantsContainer = document.getElementById('variantsContainer');

      const newVariant = document.createElement('div');
      newVariant.className = 'variant-item border border-gray-200 rounded-lg p-4 mb-4';

      newVariant.innerHTML = `
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-md font-medium text-gray-700">Variant ${variantCount}</h4>
          <button type="button" onclick="removeVariant(this)" class="text-red-500 hover:text-red-700">
            <span class="material-icons text-sm">delete</span>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-gray-600 mb-2">Color*</label>
            <input type="text" class="variant-color w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter color">
          </div>
          <div>
            <label class="block text-gray-600 mb-2">Price*</label>
            <input type="number" class="variant-price w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter price">
          </div>
          <div>
            <label class="block text-gray-600 mb-2">Quantity*</label>
            <input type="number" class="variant-quantity w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter quantity">
          </div>
        </div>

        <!-- Images -->
        <div class="mt-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Product Images</h3>

          <!-- Main Image -->
          <div class="mb-4">
            <label class="block text-gray-600 mb-2">Main Image*</label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer"
                 onclick="document.getElementById('mainImageInput_variant${variantCount}').click()">
              <div class="flex flex-col items-center">
                <span class="material-icons text-gray-400 text-2xl mb-2">upload</span>
                <p class="text-gray-600 text-sm">Click to upload main image</p>
              </div>
              <input type="file" id="mainImageInput_variant${variantCount}" class="hidden"
                     accept="image/*" onchange="handleMainImageChange(event, ${variantCount})">
            </div>
            <div id="mainImagePreview_variant${variantCount}" class="mt-2"></div>
          </div>

          <!-- Sub Images -->
          <div class="mb-4">
            <label class="block text-gray-600 mb-2">Additional Images (Exactly 3 Required)*</label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer"
                 onclick="document.getElementById('subImagesInput_variant${variantCount}').click()">
              <div class="flex flex-col items-center">
                <span class="material-icons text-gray-400 text-2xl mb-2">upload</span>
                <p class="text-gray-600 text-sm">Click to upload additional images</p>
              </div>
              <input type="file" id="subImagesInput_variant${variantCount}" class="hidden"
                     multiple accept="image/*" onchange="handleSubImagesUpload(this, ${variantCount})">
            </div>
            <div class="flex justify-between items-center mt-2">
              <span class="text-xs text-gray-500">Current: <span id="currentImageCount_variant${variantCount}">0</span>/3</span>
              <button type="button" onclick="clearAllSubImages(${variantCount})" class="text-xs text-red-500">Clear All</button>
            </div>
            <div id="subImagesPreview_variant${variantCount}" class="flex flex-wrap gap-2 mt-3"></div>
          </div>
        </div>
      `;

      variantsContainer.appendChild(newVariant);

      // init storage
      variantImages[variantCount] = { mainImage: null, subImages: [] };
    }

    // ----------------- REMOVE VARIANT -----------------
    function removeVariant(button) {
      button.closest('.variant-item').remove();
    }

    // ----------------- MAIN IMAGE HANDLER -----------------
    function handleMainImageChange(event, variantId) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        const previewContainer = document.getElementById(`mainImagePreview_variant${variantId}`);
        previewContainer.innerHTML = ""; // clear old

        const imgElement = document.createElement("img");
        imgElement.src = e.target.result;
        imgElement.className = "h-40 w-40 object-cover rounded-lg border";

        previewContainer.appendChild(imgElement);

        // store file
        variantImages[variantId].mainImage = file;
      };
      reader.readAsDataURL(file);
    }

    // ----------------- SUB IMAGES HANDLER -----------------
    function handleSubImagesUpload(input, variantId) {
      const files = Array.from(input.files);
      const previewContainer = document.getElementById(`subImagesPreview_variant${variantId}`);
      const countSpan = document.getElementById(`currentImageCount_variant${variantId}`);

      if (files.length + variantImages[variantId].subImages.length > 3) {
        alert("Exactly 3 additional images required");
        return;
      }

      files.forEach(file => {
        variantImages[variantId].subImages.push(file);
        const imgEl = document.createElement("img");
        imgEl.src = URL.createObjectURL(file);
        imgEl.className = "h-20 w-20 object-cover rounded-lg";
        previewContainer.appendChild(imgEl);
      });

      countSpan.textContent = variantImages[variantId].subImages.length;
    }

    function clearAllSubImages(variantId) {
      variantImages[variantId].subImages = [];
      document.getElementById(`subImagesPreview_variant${variantId}`).innerHTML = "";
      document.getElementById(`currentImageCount_variant${variantId}`).textContent = "0";
    }

    // ----------------- FORM SUBMISSION -----------------
    document.getElementById('addProductForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Validate variants
      if (variantCount === 0) {
        alert('Please add at least one variant');
        return;
      }

      // Collect variant data
      const variants = [];
      const variantElements = document.querySelectorAll('.variant-item');
      
      variantElements.forEach((variant, index) => {
        const color = variant.querySelector('.variant-color').value;
        const price = variant.querySelector('.variant-price').value;
        const quantity = variant.querySelector('.variant-quantity').value;
        
        if (!color || !price || !quantity) {
          alert(`Please fill all fields for variant ${index + 1}`);
          return;
        }
        
        variants.push({
          color: color,
          price: parseFloat(price),
          quantity: parseInt(quantity)
        });
      });

      // Set variants data in hidden input
      document.getElementById('variantsData').value = JSON.stringify(variants);

      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('name', document.getElementById('productName').value);
      formData.append('brand', document.getElementById('productBrand').value);
      formData.append('category', document.getElementById('productCategory').value);
      formData.append('description', document.getElementById('productDescription').value);
      formData.append('variants', JSON.stringify(variants));

      // Add images to FormData
      let totalImages = 0;
      Object.keys(variantImages).forEach(variantId => {
        if (variantImages[variantId].mainImage) {
          formData.append('images', variantImages[variantId].mainImage);
          totalImages++;
          console.log(`Added main image for variant ${variantId}:`, variantImages[variantId].mainImage.name);
        }
        variantImages[variantId].subImages.forEach(subImage => {
          formData.append('images', subImage);
          totalImages++;
          console.log(`Added sub image for variant ${variantId}:`, subImage.name);
        });
      });
      
      console.log('Total images added to FormData:', totalImages);
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, ':', value);
      }

      // Submit form
      console.log('Submitting form with data:', {
        name: document.getElementById('productName').value,
        brand: document.getElementById('productBrand').value,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value,
        variants: variants,
        imageCount: Object.keys(variantImages).length
      });

      fetch('/admin/addProduct', {
        method: 'POST',
        body: formData
      })
      .then(response => {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          return response.text().then(text => {
            console.log('Error response body:', text);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('Success response:', data);
        if (data.success) {
          alert('Product added successfully!');
          closeAddProductModal();
          location.reload(); // Refresh page to show new product
        } else {
          alert(data.error || 'Error adding product');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error adding product: ' + error.message);
      });
    });

    // ----------------- UTILITY FUNCTIONS -----------------
    function clearFilters() {
      document.getElementById('searchFilterForm').reset();
      window.location.href = '/admin/products';
    }

    function toggleDropdown(productId) {
      const dropdown = document.getElementById(`dropdown-${productId}`);
      dropdown.classList.toggle('hidden');
    }

    function editProduct(productId) {
      // Implement edit functionality
      console.log('Edit product:', productId);
    }

    function viewProduct(productId) {
      // Implement view functionality
      console.log('View product:', productId);
    }

    function toggleProductStatus(productId, currentStatus) {
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      
      fetch(`/admin/toggle-product-status/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          location.reload();
        } else {
          alert(data.error || 'Error updating product status');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error updating product status');
      });
    }
