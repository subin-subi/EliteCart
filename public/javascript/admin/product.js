let variantCount = 1;
        let mainImageFile = null;
        let subImageFiles = [];

        function openAddProductModal() {
            document.getElementById("addProductModal").classList.remove("hidden");
            updateImageCount();
            // Show add button for new products
            document.getElementById('addMainImageActions').classList.remove('hidden');
            document.getElementById('mainImageActions').classList.add('hidden');
        }

        function closeAddProductModal() {
            document.getElementById("addProductModal").classList.add("hidden");
            document.getElementById("addProductForm").reset();
            resetVariants();
            resetImages();
        }

        function resetImages() {
            mainImageFile = null;
            subImageFiles = [];
            document.getElementById('mainImagePreview').innerHTML = '';
            document.getElementById('subImagesPreview').innerHTML = '';
            // Hide replace button
            document.getElementById('mainImageActions').classList.add('hidden');
            // Show add button
            document.getElementById('addMainImageActions').classList.remove('hidden');
            // Reset removed existing images tracking
            window.removedExistingImages = [];
            updateImageCount();
        }
        
        function clearAllSubImages() {
            Swal.fire({
                title: 'Clear All Images?',
                text: 'Are you sure you want to remove all additional images?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, clear all!'
            }).then((result) => {
                if (result.isConfirmed) {
                    subImageFiles = [];
                    document.getElementById('subImagesPreview').innerHTML = '';
                    updateImageCount();
                }
            });
        }
        
        function updateImageCount() {
            const count = subImageFiles.length;
            document.getElementById('currentImageCount').textContent = count;
        }
        
        function replaceMainImage() {
            document.getElementById('mainImageInput').click();
        }
        
        function clearMainImage() {
            Swal.fire({
                title: 'Clear Main Image?',
                text: 'Are you sure you want to remove the main image?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, clear it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    mainImageFile = null;
                    document.getElementById('mainImagePreview').innerHTML = '';
                    document.getElementById('mainImageActions').classList.add('hidden');
                    document.getElementById('addMainImageActions').classList.remove('hidden');
                }
            });
        }
        
        function addMainImage() {
            document.getElementById('mainImageInput').click();
        }
        
        function showImagePreview(imageSrc) {
            Swal.fire({
                imageUrl: imageSrc,
                imageWidth: 400,
                imageHeight: 400,
                imageAlt: 'Image Preview',
                confirmButtonText: 'Close'
            });
        }

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
                        <input type="text" class="variant-color w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter color" >
                    </div>
                    <div>
                        <label class="block text-gray-600 mb-2">Price*</label>
                        <input type="number" class="variant-price w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter price" step="0.01" >
                    </div>
                    <div>
                        <label class="block text-gray-600 mb-2">Quantity*</label>
                        <input type="number" class="variant-quantity w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter quantity" min="0" >
                    </div>
                </div>
            `;
            variantsContainer.appendChild(newVariant);
        }

        function removeVariant(button) {
            const variantItem = button.closest('.variant-item');
            if (variantItem && document.querySelectorAll('.variant-item').length > 1) {
                variantItem.remove();
                updateVariantNumbers();
            }
        }

        function updateVariantNumbers() {
            const variants = document.querySelectorAll('.variant-item');
            variants.forEach((variant, index) => {
                const title = variant.querySelector('h4');
                if (title) {
                    title.textContent = `Variant ${index + 1}`;
                }
            });
            variantCount = variants.length;
        }

        function resetVariants() {
            const variantsContainer = document.getElementById('variantsContainer');
            variantsContainer.innerHTML = `
                <div class="variant-item border border-gray-200 rounded-lg p-4 mb-4">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="text-md font-medium text-gray-700">Variant 1</h4>
                        <button type="button" onclick="removeVariant(this)" class="text-red-500 hover:text-red-700">
                            <span class="material-icons text-sm">delete</span>
                        </button>
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-gray-600 mb-2">Color*</label>
                            <input type="text" class="variant-color w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter color" >
                        </div>
                        <div>
                            <label class="block text-gray-600 mb-2">Price*</label>
                            <input type="number" class="variant-price w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter price" step="0.01" >
                        </div>
                        <div>
                            <label class="block text-gray-600 mb-2">Quantity*</label>
                            <input type="number" class="variant-quantity w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter quantity" min="0" >
                        </div>
                    </div>
                </div>
            `;
            variantCount = 1;
        }

        let currentCropper = null;
        let currentCropCallback = null;

        function openCropModal(imageFile, callback) {
            const modal = document.getElementById('cropModal');
            const cropImage = document.getElementById('cropImage');
            
            const reader = new FileReader();
            reader.onload = function(e) {
                cropImage.src = e.target.result;
                modal.classList.remove('hidden');
                
                if (currentCropper) {
                    currentCropper.destroy();
                }
                
                currentCropper = new Cropper(cropImage, {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 1,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: false,
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

        function applyCrop() {
            if (currentCropper && currentCropCallback) {
                const canvas = currentCropper.getCroppedCanvas({
                    width: 800,
                    height: 800,
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high',
                });
                
                canvas.toBlob(function(blob) {
                    const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
                    currentCropCallback(file);
                    closeCropModal();
                }, 'image/jpeg', 0.9);
            }
        }

                function handleMainImageUpload(input) {
            const file = input.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                Swal.fire('Error', `${file.name} is not an image file`, 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                Swal.fire('Error', `${file.name} is too large. Maximum size is 5MB`, 'error');
                return;
            }
            
            // Show loading state
            const imagePreview = document.getElementById('mainImagePreview');
            imagePreview.innerHTML = '<div class="w-32 h-32 bg-gray-200 rounded-lg border flex items-center justify-center"><span class="material-icons text-gray-400 text-2xl animate-spin">hourglass_empty</span></div>';

            openCropModal(file, function(croppedFile) {
                mainImageFile = croppedFile;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imagePreview = document.getElementById('mainImagePreview');
                    imagePreview.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'w-32 h-32 object-cover rounded-lg border cursor-pointer';
                    img.onclick = function() { showImagePreview(this.src); };
                    imagePreview.appendChild(img);
                    // Show replace button when image is uploaded
                    document.getElementById('mainImageActions').classList.remove('hidden');
                    document.getElementById('addMainImageActions').classList.add('hidden');
                    updateImageCount();
                };
                reader.onerror = function() {
                    // Show error state
                    const imagePreview = document.getElementById('mainImagePreview');
                    imagePreview.innerHTML = '<div class="w-32 h-32 bg-red-100 rounded-lg border flex items-center justify-center"><span class="material-icons text-red-400 text-2xl">error</span></div>';
                    Swal.fire('Error', 'Failed to load image preview', 'error');
                };
                reader.readAsDataURL(croppedFile);
            });
        }

        function handleSubImagesUpload(input) {
            const files = Array.from(input.files);
            
            // Validate file types and sizes
            const validFiles = files.filter(file => {
                if (!file.type.startsWith('image/')) {
                    Swal.fire('Error', `${file.name} is not an image file`, 'error');
                    return false;
                }
                if (file.size > 5 * 1024 * 1024) {
                    Swal.fire('Error', `${file.name} is too large. Maximum size is 5MB`, 'error');
                    return false;
                }
                return true;
            });
            
            if (validFiles.length === 0) return;
            
            // Count existing images (both file objects and paths)
            const existingImageCount = subImageFiles.filter(file => typeof file === 'string').length;
            const newImageCount = subImageFiles.filter(file => typeof file === 'object').length;
            
            // Check if adding these files would exceed the limit
            if (existingImageCount + newImageCount + validFiles.length > 3) {
                Swal.fire('Warning', 'You can only have up to 3 additional images total', 'warning');
                return;
            }
            
            // Process each file
            validFiles.forEach(file => {
                // Show loading state for this file
                const loadingContainer = document.createElement('div');
                loadingContainer.className = 'relative inline-block';
                loadingContainer.innerHTML = '<div class="w-20 h-20 bg-gray-200 rounded-lg border flex items-center justify-center"><span class="material-icons text-gray-400 text-lg animate-spin">hourglass_empty</span></div>';
                document.getElementById('subImagesPreview').appendChild(loadingContainer);
                
                openCropModal(file, function(croppedFile) {
                    // Remove loading state
                    loadingContainer.remove();
                    
                    subImageFiles.push(croppedFile);
                    
                                        const reader = new FileReader();
                    reader.onload = function(e) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'relative inline-block';
                        
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = 'w-20 h-20 object-cover rounded-lg border cursor-pointer';
                        img.onclick = function() { showImagePreview(this.src); };
                        
                        const removeBtn = document.createElement('button');
                        removeBtn.type = 'button';
                        removeBtn.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600';
                        removeBtn.innerHTML = '×';
                        removeBtn.onclick = function() {
                            Swal.fire({
                                title: 'Remove Image?',
                                text: 'Are you sure you want to remove this image?',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#d33',
                                cancelButtonColor: '#3085d6',
                                confirmButtonText: 'Yes, remove it!'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    const index = subImageFiles.indexOf(croppedFile);
                                    if (index > -1) {
                                        subImageFiles.splice(index, 1);
                                        imgContainer.remove();
                                    }
                                    updateImageCount();
                                }
                            });
                        };
                        
                        imgContainer.appendChild(img);
                        imgContainer.appendChild(removeBtn);
                        document.getElementById('subImagesPreview').appendChild(imgContainer);
                        updateImageCount();
                    };
                    reader.onerror = function() {
                        // Show error state
                        const errorContainer = document.createElement('div');
                        errorContainer.className = 'relative inline-block';
                        errorContainer.innerHTML = '<div class="w-20 h-20 bg-red-100 rounded-lg border flex items-center justify-center"><span class="material-icons text-red-400 text-lg">error</span></div>';
                        document.getElementById('subImagesPreview').appendChild(errorContainer);
                        Swal.fire('Error', 'Failed to load image preview', 'error');
                    };
                    reader.readAsDataURL(croppedFile);
                });
            });
        }

        function toggleDropdown(productId) {
            const dropdown = document.getElementById(`dropdown-${productId}`);
            const allDropdowns = document.querySelectorAll('[id^="dropdown-"]');
            
            allDropdowns.forEach(dd => {
                if (dd.id !== `dropdown-${productId}`) {
                    dd.classList.add('hidden');
                }
            });
            
            dropdown.classList.toggle('hidden');
        }

        async function editProduct(productId) {
            try {
                const response = await fetch(`/admin/product/${productId}`);
                const data = await response.json();
                
                if (data.success) {
                    // Populate form with product data
                    document.getElementById('productName').value = data.product.name || '';
                    document.getElementById('productBrand').value = data.product.brand?._id || '';
                    document.getElementById('productCategory').value = data.product.category?._id || '';
                    document.getElementById('productPrice').value = data.product.price || '';
                    document.getElementById('productDescription').value = data.product.description || '';
                    
                    // Handle existing images for edit mode
                    if (data.product.mainImage) {
                        // Show existing main image
                        const mainImagePreview = document.getElementById('mainImagePreview');
                        mainImagePreview.innerHTML = `<img src="${data.product.mainImage}" alt="Main Image" class="w-32 h-32 object-cover rounded-lg border cursor-pointer" onclick="showImagePreview('${data.product.mainImage}')">`;
                        // Store the existing image path
                        mainImageFile = data.product.mainImage;
                        // Show replace button
                        document.getElementById('mainImageActions').classList.remove('hidden');
                        document.getElementById('addMainImageActions').classList.add('hidden');
                    } else {
                        // Hide replace button for new products
                        document.getElementById('mainImageActions').classList.add('hidden');
                        document.getElementById('addMainImageActions').classList.remove('hidden');
                    }
                    
                    if (data.product.subImages && data.product.subImages.length > 0) {
                        // Show existing sub images
                        const subImagesPreview = document.getElementById('subImagesPreview');
                        subImagesPreview.innerHTML = '';
                        data.product.subImages.forEach((imagePath, index) => {
                            const imgContainer = document.createElement('div');
                            imgContainer.className = 'relative inline-block';
                            
                            const img = document.createElement('img');
                            img.src = imagePath;
                            img.className = 'w-20 h-20 object-cover rounded-lg border cursor-pointer';
                            img.onclick = function() { showImagePreview(this.src); };
                            
                            const removeBtn = document.createElement('button');
                            removeBtn.type = 'button';
                            removeBtn.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600';
                            removeBtn.innerHTML = '×';
                            removeBtn.onclick = function() {
                                Swal.fire({
                                    title: 'Remove Image?',
                                    text: 'Are you sure you want to remove this image?',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#d33',
                                    cancelButtonColor: '#3085d6',
                                    confirmButtonText: 'Yes, remove it!'
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        const index = subImageFiles.indexOf(imagePath);
                                        if (index > -1) {
                                            subImageFiles.splice(index, 1);
                                        }
                                        imgContainer.remove();
                                        
                                        // If this was an existing image, mark it for removal
                                        if (imgContainer.hasAttribute('data-existing-image')) {
                                            if (!window.removedExistingImages) {
                                                window.removedExistingImages = [];
                                            }
                                            window.removedExistingImages.push(imagePath);
                                        }
                                        updateImageCount();
                                    }
                                });
                            };
                            
                            imgContainer.appendChild(img);
                            imgContainer.appendChild(removeBtn);
                            subImagesPreview.appendChild(imgContainer);
                            
                            // Store existing sub image paths
                            subImageFiles.push(imagePath);
                            
                            // Add data attribute to track if this is an existing image
                            imgContainer.setAttribute('data-existing-image', imagePath);
                        });
                        updateImageCount();
                    }
                    
                    // Populate variants
                    if (data.product.variants && data.product.variants.length > 0) {
                        resetVariants();
                        data.product.variants.forEach((variant, index) => {
                            if (index > 0) {
                                addVariant();
                            }
                            const variantElements = document.querySelectorAll('.variant-item');
                            if (variantElements[index]) {
                                const variantElement = variantElements[index];
                                const colorInput = variantElement.querySelector('.variant-color');
                                const priceInput = variantElement.querySelector('.variant-price');
                                const quantityInput = variantElement.querySelector('.variant-quantity');
                                
                                if (colorInput) colorInput.value = variant.color || '';
                                if (priceInput) priceInput.value = variant.price || '';
                                if (quantityInput) quantityInput.value = variant.quantity || '';
                            }
                        });
                    }
                    
                    // Change modal title and button
                    document.querySelector('#addProductModal h2').textContent = 'Edit Product';
                    document.querySelector('#addProductModal button[type="submit"]').textContent = 'Update Product';
                    document.getElementById('addProductForm').setAttribute('data-edit-id', productId);
                    
                    openAddProductModal();
                } else {
                    Swal.fire('Error', data.message || 'Failed to load product', 'error');
                }
            } catch (error) {
                console.error('Error loading product:', error);
                Swal.fire('Error', 'Failed to load product details', 'error');
            }
        }

        async function toggleProductStatus(productId, currentStatus) {
            const action = currentStatus === 'active' ? 'block' : 'unblock';
            
            try {
                const result = await Swal.fire({
                    title: `Are you sure you want to ${action} this product?`,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: currentStatus === 'active' ? "#d33" : "#28a745",
                    cancelButtonColor: "#6c757d",
                    confirmButtonText: `Yes, ${action} it!`
                });

                if (result.isConfirmed) {
                    const response = await fetch(`/admin/toggle-product-status/${productId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    const data = await response.json();

                    if (data.success) {
                        Swal.fire('Success', data.message, 'success');
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        Swal.fire('Error', data.message || `Failed to ${action} product`, 'error');
                    }
                }
            } catch (error) {
                console.error('Error toggling product status:', error);
                Swal.fire('Error', 'Network error occurred', 'error');
            }
        }

        async function viewProduct(productId) {
            try {
                const response = await fetch(`/admin/product/${productId}`);
                const data = await response.json();
                
                if (data.success) {
                    const product = data.product;
                    let variantsHtml = '';
                    
                    if (product.variants && product.variants.length > 0) {
                        variantsHtml = product.variants.map(variant => {
                            return `<div class="mb-2 p-2 bg-gray-50 rounded">
                                <strong>Color:</strong> ${variant.color} | 
                                <strong>Price:</strong> ₹${variant.price} | 
                                <strong>Quantity:</strong> ${variant.quantity}
                            </div>`;
                        }).join('');
                    }
                    
                    // Get main image for display
                    let mainImageDisplay = 'No image';
                    if (product.mainImage) {
                        mainImageDisplay = `<img src="${product.mainImage}" alt="${product.name}" class="w-32 h-32 object-cover rounded-lg mb-2">`;
                    } else if (product.variants && product.variants[0] && product.variants[0].images && product.variants[0].images.length > 0) {
                        mainImageDisplay = `<img src="${product.variants[0].images[0]}" alt="${product.name}" class="w-32 h-32 object-cover rounded-lg mb-2">`;
                    }
                    
                    Swal.fire({
                        title: product.name,
                        html: `
                            <div class="text-left">
                                <div class="text-center mb-4">
                                    ${mainImageDisplay}
                                </div>
                                <p><strong>Category:</strong> ${product.category?.name || 'N/A'}</p>
                                <p><strong>Brand:</strong> ${product.brand?.name || 'N/A'}</p>
                                <p><strong>Price:</strong> ₹${product.price}</p>
                                <p><strong>Description:</strong> ${product.description}</p>
                                <p><strong>Status:</strong> ${product.status}</p>
                                <p><strong>Variants:</strong></p>
                                ${variantsHtml}
                            </div>
                        `,
                        width: '600px',
                        confirmButtonText: 'Close'
                    });
                } else {
                    Swal.fire('Error', data.message || 'Failed to load product', 'error');
                }
            } catch (error) {
                console.error('Error viewing product:', error);
                Swal.fire('Error', 'Failed to load product details', 'error');
            }
        }

        async function deleteProduct(productId) {
            try {
                const result = await Swal.fire({
                    title: 'Are you sure you want to delete this product?',
                    text: "This action cannot be undone!",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#d33",
                    cancelButtonColor: "#6c757d",
                    confirmButtonText: "Yes, delete it!"
                });

                if (result.isConfirmed) {
                    const response = await fetch(`/admin/delete-product/${productId}`, {
                        method: 'DELETE'
                    });

                    const data = await response.json();

                    if (data.success) {
                        Swal.fire('Deleted!', data.message, 'success');
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        Swal.fire('Error', data.message || 'Failed to delete product', 'error');
                    }
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                Swal.fire('Error', 'Network error occurred', 'error');
            }
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('[id^="dropdown-"]') && !event.target.closest('button')) {
                document.querySelectorAll('[id^="dropdown-"]').forEach(dropdown => {
                    dropdown.classList.add('hidden');
                });
            }
        });

        // Setup search functionality
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('searchProduct');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    const searchTerm = this.value.toLowerCase();
                    const rows = document.querySelectorAll('tbody tr');
                    
                    rows.forEach(row => {
                        const productName = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
                        const category = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
                        const brand = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
                        
                        if (productName.includes(searchTerm) || category.includes(searchTerm) || brand.includes(searchTerm)) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                });
            }

            // Setup form submission
            const addProductForm = document.getElementById('addProductForm');
            if (addProductForm) {
                addProductForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const isEdit = this.hasAttribute('data-edit-id');
                    const productId = this.getAttribute('data-edit-id');
                    
                    // Validate main image
                    // if (!isEdit && !mainImageFile) {
                    //     Swal.fire('Warning', 'Please upload a main image', 'warning');
                    //     return;
                    // }
                    // Assume you have a span for showing the error
const errorElement = document.getElementById('mainImageError');

if (!isEdit && !mainImageFile) {
    errorElement.textContent = 'enter the product name';
    errorElement.style.color = 'red';
    return;
} else {
    errorElement.textContent = ''; // Clear the error if valid
}

                    
                    // Collect and validate variants
                    const variants = collectVariants();
                    if (variants.length === 0) {
                        Swal.fire('Warning', 'Please add at least one variant', 'warning');
                        return;
                    }
                    
                    // Check if all variant fields are filled
                    const invalidVariants = variants.filter(variant => 
                        !variant.color.trim() || !variant.price || variant.price <= 0 || variant.quantity < 0
                    );
                    
                    if (invalidVariants.length > 0) {
                        Swal.fire('Warning', 'Please fill all variant fields correctly. Color and price are required, quantity must be 0 or more.', 'warning');
                        return;
                    }
                    
                    // Collect form data
                    const formData = new FormData();
                    formData.append('name', document.getElementById('productName').value.trim());
                    formData.append('brand', document.getElementById('productBrand').value);
                    formData.append('category', document.getElementById('productCategory').value);
                    formData.append('price', document.getElementById('productPrice').value);
                    formData.append('description', document.getElementById('productDescription').value.trim());
                    
                    // Add images
                    let hasNewImages = false;
                    
                    if (mainImageFile && typeof mainImageFile === 'object') {
                        // New file uploaded
                        formData.append('images', mainImageFile);
                        hasNewImages = true;
                    }
                    
                    subImageFiles.forEach(file => {
                        if (typeof file === 'object') {
                            // New file uploaded
                            formData.append('images', file);
                            hasNewImages = true;
                        }
                    });
                    
                    // If no new images uploaded, indicate that we want to keep existing ones
                    if (!hasNewImages) {
                        formData.append('keepExistingImages', 'true');
                    }
                    
                    // Handle removed existing images
                    if (window.removedExistingImages && window.removedExistingImages.length > 0) {
                        formData.append('removedExistingImages', JSON.stringify(window.removedExistingImages));
                    }
                    
                    // Add variants
                    formData.append('variants', JSON.stringify(variants));
                    
                    try {
                        const url = isEdit ? `/admin/edit-product/${productId}` : '/admin/add-product';
                        const method = isEdit ? 'PUT' : 'POST';
                        
                        // Show loading state
                        const submitBtn = document.querySelector('#addProductModal button[type="submit"]');
                        const originalText = submitBtn.textContent;
                        submitBtn.textContent = 'Saving...';
                        submitBtn.disabled = true;
                        
                        const response = await fetch(url, {
                            method: method,
                            body: formData
                        });

                        const data = await response.json();

                        if (data.success) {
                            Swal.fire('Success', data.message, 'success');
                            closeAddProductModal();
                            
                            // Reset form for edit mode
                            if (isEdit) {
                                this.removeAttribute('data-edit-id');
                                document.querySelector('#addProductModal h2').textContent = 'Add New Product';
                                document.querySelector('#addProductModal button[type="submit"]').textContent = 'Add Product';
                            }
                            
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        } else {
                            Swal.fire('Error', data.message || 'Failed to save product', 'error');
                        }
                    } catch (error) {
                        console.error('Error saving product:', error);
                        Swal.fire('Error', 'Network error occurred. Please try again.', 'error');
                    } finally {
                        // Reset button state
                        const submitBtn = document.querySelector('#addProductModal button[type="submit"]');
                        submitBtn.textContent = isEdit ? 'Update Product' : 'Add Product';
                        submitBtn.disabled = false;
                    }
                });
            }
        });

        function collectVariants() {
            const variants = [];
            document.querySelectorAll('.variant-item').forEach((variant, index) => {
                const colorInput = variant.querySelector('.variant-color');
                const priceInput = variant.querySelector('.variant-price');
                const quantityInput = variant.querySelector('.variant-quantity');
                
                if (colorInput && priceInput && quantityInput) {
                    variants.push({
                        color: colorInput.value.trim(),
                        price: parseFloat(priceInput.value) || 0,
                        quantity: parseInt(quantityInput.value) || 0
                    });
                }
            });
            return variants;
        }

        // Handle status filter
        document.querySelector('select').addEventListener('change', function() {
            const status = this.value;
            const currentUrl = new URL(window.location);
            
            if (status && status !== 'All Status') {
                currentUrl.searchParams.set('status', status);
            } else {
                currentUrl.searchParams.delete('status');
            }
            
            currentUrl.searchParams.delete('page');
            window.location.href = currentUrl.toString();
        });