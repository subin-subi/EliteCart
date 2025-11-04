function toggleOfferSelection() {
  const offerType = document.getElementById("offerType").value;
  const container = document.getElementById("offerSelectionContainer");
  const label = document.getElementById("offerSelectionLabel");
  
  if (offerType === "PRODUCT") {
    container.classList.remove("hidden");
    label.textContent = "Select Product";
  } else if (offerType === "CATEGORY") {
    container.classList.remove("hidden");
    label.textContent = "Select Category";
  } else {
    container.classList.add("hidden");
  }
}



  function openAddOfferModal() {
    document.getElementById('addOfferModal').classList.remove('hidden');
  }

  function closeAddOfferModal() {
    document.getElementById('addOfferModal').classList.add('hidden');
  }



  function updateOfferSelection() {
    const offerType = document.getElementById('offerType').value;
    const container = document.getElementById('offerSelectionContainer');
    const productOptions = document.querySelectorAll('.product-option');
    const categoryOptions = document.querySelectorAll('.category-option');

    if (offerType === 'PRODUCT') {
      container.classList.remove('hidden');
      productOptions.forEach(opt => opt.classList.remove('hidden'));
      categoryOptions.forEach(opt => opt.classList.add('hidden'));
    } 
    else if (offerType === 'CATEGORY') {
      container.classList.remove('hidden');
      categoryOptions.forEach(opt => opt.classList.remove('hidden'));
      productOptions.forEach(opt => opt.classList.add('hidden'));
    } 
    else {
      container.classList.add('hidden');
    }
  }






function updateEditOfferSelection() {
  const type = document.getElementById("editOfferType").value;
  const container = document.getElementById("editOfferSelectionContainer");
  const selectionLabel = document.getElementById("editOfferSelectionLabel");

  const productOptions = document.querySelectorAll(".edit-product-option");
  const categoryOptions = document.querySelectorAll(".edit-category-option");

  // Hide all options initially
  productOptions.forEach(opt => opt.classList.add("hidden"));
  categoryOptions.forEach(opt => opt.classList.add("hidden"));

  if (type === "PRODUCT") {
    container.classList.remove("hidden");
    selectionLabel.textContent = "Select Product";
    productOptions.forEach(opt => opt.classList.remove("hidden"));
  } else if (type === "CATEGORY") {
    container.classList.remove("hidden");
    selectionLabel.textContent = "Select Category";
    categoryOptions.forEach(opt => opt.classList.remove("hidden"));
  } else {
    container.classList.add("hidden");
  }
}



  ////////////////////////////////offer adding//////////////////////////////////////////////////////

  // Show/Hide modal
  function openAddOfferModal() {
    document.getElementById("addOfferModal").classList.remove("hidden");
  }

  function closeAddOfferModal() {
    document.getElementById("addOfferModal").classList.add("hidden");
  }

  // Handle Offer Type Selection (Category or Product)
  function updateOfferSelection() {
    const offerType = document.getElementById('offerType').value;
    const container = document.getElementById('offerSelectionContainer');
    const productOptions = document.querySelectorAll('.product-option');
    const categoryOptions = document.querySelectorAll('.category-option');

    if (offerType === 'PRODUCT') {
      container.classList.remove('hidden');
      productOptions.forEach(opt => opt.classList.remove('hidden'));
      categoryOptions.forEach(opt => opt.classList.add('hidden'));
    } else if (offerType === 'CATEGORY') {
      container.classList.remove('hidden');
      categoryOptions.forEach(opt => opt.classList.remove('hidden'));
      productOptions.forEach(opt => opt.classList.add('hidden'));
    } else {
      container.classList.add('hidden');
    }
  }

  document.getElementById("addOfferForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get values
  const name = document.getElementById("offerName").value.trim();
  const offerType = document.getElementById("offerType").value;
  const selectionId = document.getElementById("offerSelection").value;
  const discountPercent = document.getElementById("discountPercent").value.trim();
  const startAt = document.getElementById("startDate").value;
  const endAt = document.getElementById("expiryDate").value;
  const description = document.getElementById("description").value.trim();

  // Get error spans
  const nameError = document.getElementById("offerNameError");
  const offerTypeError = document.getElementById("offerTypeError") || document.createElement("span");
  const selectionError = document.getElementById("selectionError") || document.createElement("span");
  const discountError = document.getElementById("discountPercentError");
  const startDateError = document.getElementById("startDateError");
  const expiryDateError = document.getElementById("expiryDateError");
  const descriptionError = document.getElementById("descriptionError") || document.createElement("span");

  // Clear all old errors
  [nameError, offerTypeError, selectionError, discountError, startDateError, expiryDateError, descriptionError]
    .forEach(el => el.textContent = "");

  let isValid = true;

  // Name validation
  const namePattern = /^[A-Za-z\s]{3,}$/;
  if (!namePattern.test(name)) {
    nameError.textContent = "Name must have at least 3 letters and contain only alphabets and spaces.";
    isValid = false;
  }

  // Offer Type
  if (!offerType) {
    offerTypeError.textContent = "Please select an offer type.";
    // Append below dropdown if not already in DOM
    const dropdown = document.getElementById("offerType");
    if (!document.getElementById("offerTypeError")) {
      dropdown.insertAdjacentElement("afterend", offerTypeError);
      offerTypeError.id = "offerTypeError";
      offerTypeError.className = "text-red-500 text-xs mt-1 block";
    }
    isValid = false;
  }

  // Selection
  if (!selectionId) {
    selectionError.textContent = "Please select a product or category.";
    const selection = document.getElementById("offerSelection");
    if (!document.getElementById("selectionError")) {
      selection.insertAdjacentElement("afterend", selectionError);
      selectionError.id = "selectionError";
      selectionError.className = "text-red-500 text-xs mt-1 block";
    }
    isValid = false;
  }

  // Discount validation
  const discount = parseFloat(discountPercent);
  if (isNaN(discount) || discount < 1 || discount > 90) {
    discountError.textContent = "Discount percentage must be between 1 and 90.";
    isValid = false;
  }

  // Description validation
  if (description.length < 7) {
    descriptionError.textContent = "Description must be at least 7 characters long.";
    const desc = document.getElementById("description");
    if (!document.getElementById("descriptionError")) {
      desc.insertAdjacentElement("afterend", descriptionError);
      descriptionError.id = "descriptionError";
      descriptionError.className = "text-red-500 text-xs mt-1 block";
    }
    isValid = false;
  }

  // Date validation
  if (!startAt) {
    startDateError.textContent = "Please select a start date.";
    isValid = false;
  }

  if (!endAt) {
    expiryDateError.textContent = "Please select an expiry date.";
    isValid = false;
  }

  if (startAt && endAt) {
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (endDate < startDate) {
      expiryDateError.textContent = "Expiry date must be after the start date.";
      isValid = false;
    }
  }

  // Stop if validation failed
  if (!isValid) return;

  // Prepare data
  const formData = {
    name,
    offerType,
    selectionId,
    discountPercent,
    startAt,
    endAt,
    description,
  };

 try {
  const res = await axios.post("/admin/add-offer", formData);

  if (res.data.success) {
    Swal.fire({
      icon: "success",
      title: "Offer Added Successfully!",
      showConfirmButton: false,
      timer: 1500
    });

    closeAddOfferModal();
    setTimeout(() => location.reload(), 1500);

  } else {
    Swal.fire({
      icon: "error",
      title: "Failed to Add Offer",
      text: res.data.message || "Something went wrong. Please try again.",
      confirmButtonColor: "#3085d6"
    });
  }

} catch (err) {
  console.error("Error adding offer:", err);
  Swal.fire({
    icon: "error",
    title: "Server Error",
    text: "Unable to add offer. Please try again later.",
    confirmButtonColor: "#d33"
  });
}
});



 ////////////////////////////////// Delete Offer ////////////////////////////////////////

async function deleteOffer(offerId) {
  try {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      const response = await axios.delete(`/admin/delete-offer/${offerId}`);

      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Offer has been deleted successfully.",
          timer: 1200,
          showConfirmButton: false
        });

        // Update UI after deletion
        const rowActions = document.querySelector(
          `button[onclick="deleteOffer('${offerId}')"]`
        ).parentElement;

        rowActions.innerHTML = `
          <span class="text-red-500 font-semibold text-sm">Offer Deleted</span>
        `;
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed!",
          text: response.data.message || "Could not delete offer."
        });
      }
    }
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error!",
      text: "Something went wrong. Please try again."
    });
  }
}


/////////////////////////////// offer edit ////////////////////////////////////////////

function openEditOfferModal(offer) {
  // Fill all input fields
  document.getElementById("editOfferId").value = offer._id;
  document.getElementById("editOfferName").value = offer.name;
  document.getElementById("editOfferType").value = offer.offerType;
  document.getElementById("editDiscountPercent").value = offer.discountPercent;
  document.getElementById("editStartDate").value = offer.startAt.split("T")[0];
  document.getElementById("editExpiryDate").value = offer.endAt.split("T")[0];
  document.getElementById("editDescription").value = offer.description;

  // Show correct dropdown (Product or Category)
  updateEditOfferSelection();

  // Select correct item after showing dropdown
  if (offer.offerType === "PRODUCT" && offer.productId) {
    document.getElementById("editOfferSelection").value = offer.productId._id || offer.productId;
  } else if (offer.offerType === "CATEGORY" && offer.categoryId) {
    document.getElementById("editOfferSelection").value = offer.categoryId._id || offer.categoryId;
  }

  // Finally show modal
  document.getElementById("editOfferModal").classList.remove("hidden");
}




// Close Edit Offer Modal
function closeEditOfferModal() {
  document.getElementById('editOfferModal').classList.add('hidden');
}


document.getElementById("editOfferForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
    offerId: document.getElementById("editOfferId").value,
    name: document.getElementById("editOfferName").value.trim(),
    offerType: document.getElementById("editOfferType").value,
    selectionId: document.getElementById("editOfferSelection").value,
    discountPercent: document.getElementById("editDiscountPercent").value,
    startAt: document.getElementById("editStartDate").value,
    endAt: document.getElementById("editExpiryDate").value,
    description: document.getElementById("editDescription").value.trim(),
  };

  // 🧠 Simple validation
  if (!formData.name || !/^[A-Za-z\s]{3,}$/.test(formData.name)) {
    Swal.fire({ icon: "error", title: "Invalid Name", text: "Offer name must have at least 3 letters and no special characters." });
    return;
  }
  if (formData.description.length < 7) {
    Swal.fire({ icon: "error", title: "Invalid Description", text: "Description must be at least 7 characters long." });
    return;
  }
  if (formData.discountPercent < 1 || formData.discountPercent > 90) {
    Swal.fire({ icon: "error", title: "Invalid Discount", text: "Discount must be between 1 and 90%." });
    return;
  }
  if (new Date(formData.endAt) < new Date(formData.startAt)) {
    Swal.fire({ icon: "error", title: "Invalid Dates", text: "Expiry date cannot be before start date." });
    return;
  }

  try {
    const res = await axios.post("/admin/edit-offer", formData);

    if (res.data.success) {
      Swal.fire({
        icon: "success",
        title: "Offer Updated Successfully!",
        showConfirmButton: false,
        timer: 1500
      });

      closeEditOfferModal();
      setTimeout(() => location.reload(), 1500);
    } else {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: res.data.message || "Could not update offer."
      });
    }
  } catch (err) {
    console.error("Error updating offer:", err);
    Swal.fire({
      icon: "error",
      title: "Server Error",
      text: "Something went wrong while updating the offer."
    });
  }
});
