

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
  if (searchInput) searchInput.value = "";  // clear on reload
});

  });


  ///////////////////////////////////////////edit////////////////////////////////////////////////
 
 
 
  // async function editProduct(productId) {
  //   try {
  //     const res = await fetch(`/admin/product/${productId}`);
  //     const product = await res.json();
  //     console.log(product);
      
  
  //     if (!product.success) {
  //       return Swal.fire("Error", "Product not found", "error");
  //     }
      
  
  //     const data = product.data;
  //     console.log("Product data:", data);

  
  //     // Fill form
  //     document.getElementById("editProductId").value = data._id;
  //     document.getElementById("editProductName").value = data.name;
  //     document.getElementById("editProductCategory").value = data.category?._id || "";
  //     document.getElementById("editProductBrand").value = data.brand?._id || "";      
  //     document.getElementById("editProductColor").value = data.color || "";
  //     document.getElementById("editProductPrice").value = data.price || "";
  //     document.getElementById("editProductStock").value = data.stock || "";
  //     document.getElementById("editProductDescription").value = data.description || "";

  //     document.getElementById("editProductForm").action = `/admin/products/${data._id}`;

  
  //     // Images
  //     document.getElementById("editMainImagePreview").src = data.mainImage || "";
  
  //     const subImagesPreview = document.getElementById("editSubImagesPreview");
  //     subImagesPreview.innerHTML = "";
  //     if (data.subImages && data.subImages.length > 0) {
  //       data.subImages.forEach(img => {
  //         const imgEl = document.createElement("img");
  //         imgEl.src = img;
  //         imgEl.className = "h-20 w-20 object-cover rounded-lg border";
  //         subImagesPreview.appendChild(imgEl);
  //       });
  //     }
  
  //     // Show modal
  //     const editModal = document.getElementById("editProductModal");
  //     editModal.classList.remove("hidden");
  //     editModal.classList.add("flex");
  
  //   } catch (err) {
  //     console.error(err);
  //     Swal.fire("Error", "Something went wrong", "error");
  //   }
  // }
  




  function closeEditProductModal() {
    const editModal = document.getElementById("editProductModal");
    editModal.classList.add("hidden");
    editModal.classList.remove("flex");
  }
  


async function editProduct(productId) {
  try {
    const res = await fetch(`/admin/product/${productId}`);
    const product = await res.json();

    if (!product.success) {
      return Swal.fire("Error", "Product not found", "error");
    }

    const data = product.data;

    // Fill form
    document.getElementById("editProductId").value = data._id;
    document.getElementById("editProductName").value = data.name;
    document.getElementById("editProductCategory").value = data.category?._id || "";
    document.getElementById("editProductBrand").value = data.brand?._id || "";
    document.getElementById("editProductDescription").value = data.description || "";

    // Handle first variant (if exists)
    if (data.variants && data.variants.length > 0) {
      const variant = data.variants[0];
      document.getElementById("editProductVolume").value = variant.volume || "";
      document.getElementById("editProductStock").value = variant.stock || "";
      document.getElementById("editProductPrice").value = variant.price || "";
      

      // Images
      document.getElementById("editMainImagePreview").src = variant.mainImage || "";
      const subImagesPreview = document.getElementById("editSubImagesPreview");
      subImagesPreview.innerHTML = "";
      if (variant.subImages && variant.subImages.length > 0) {
        variant.subImages.forEach(img => {
          const imgEl = document.createElement("img");
          imgEl.src = img;
          imgEl.className = "h-20 w-20 object-cover rounded-lg border";
          subImagesPreview.appendChild(imgEl);
        });
      }
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


function closeEditProductModal() {
  const editModal = document.getElementById("editProductModal");
  editModal.classList.add("hidden");
  editModal.classList.remove("flex");
}

const editForm = document.getElementById("editProductForm");

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(editForm);
  const productId = document.getElementById("editProductId").value;

  try {
    const res = await fetch(`/admin/products/${productId}`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log("Update response:", data);

    if (data.success) {
      Swal.fire({
        title: "Success!",
        text: data.message,
        icon: "success",
        confirmButtonColor: "#3085d6",
      }).then(() => {
        // Close the modal
        document.getElementById("editProductModal").classList.add("hidden");
        document.getElementById("editProductModal").classList.remove("flex");

        // Update the product row in the table dynamically
        const updated = data.product;
        const row = document.querySelector(`#product-row-${updated._id}`);

        if (row) {
          row.querySelector(".product-name").textContent = updated.name;
          row.querySelector(".product-price").textContent = updated.price;
          row.querySelector(".product-category").textContent = updated.category;
          row.querySelector(".product-stock").textContent = updated.stock;

          if (updated.imageUrl) {
            row.querySelector(".product-image").src = updated.imageUrl;
          }
        }
      });
      window.location.reload()
    } else {
      Swal.fire("Error", data.message || "Failed to update product", "error");
    }
  } catch (err) {
    console.error("Update error:", err);
    Swal.fire("Error", "Something went wrong!", "error");
  }
});
