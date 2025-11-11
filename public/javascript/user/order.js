let cancelOrderId = null;
let cancelItemId = null;

function openCancelModal(orderId, itemId = null) {
  cancelOrderId = orderId;
  cancelItemId = itemId;
  document.getElementById("cancelModal").classList.remove("hidden");
}

function closeCancelModal() {
  cancelOrderId = null;
  cancelItemId = null;
  document.getElementById("cancelModal").classList.add("hidden");
  document.getElementById("cancelSelect").value = "";
  document.getElementById("cancelReason").classList.add("hidden");
  document.getElementById("cancelReason").value = "";
}

// 🧩 Show textarea when "Other" is selected
document.getElementById("cancelSelect").addEventListener("change", function() {
  const reasonBox = document.getElementById("cancelReason");
  if (this.value === "Other") {
    reasonBox.classList.remove("hidden");
  } else {
    reasonBox.classList.add("hidden");
  }
});

document.getElementById("confirmCancelBtn").addEventListener("click", async () => {
  const selectedReason = document.getElementById("cancelSelect").value;
  const customReason = document.getElementById("cancelReason").value.trim();

  let reason = selectedReason === "Other" ? customReason : selectedReason;

  if (!reason || reason.length < 10) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Reason",
      text: "Please provide a valid reason (at least 10 characters).",
      confirmButtonColor: "#f87171",
    });
    return;
  }

  try {
    const url = cancelItemId
      ? `/item-cancel/${cancelOrderId}/${cancelItemId}`
      : `/order-cancel/${cancelOrderId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    const result = await response.json();

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Cancelled!",
        text: result.message || "Your cancellation was successful.",
        confirmButtonColor: "#16a34a",
      }).then(() => window.location.reload());
    } else {
      Swal.fire({
        icon: "error",
        title: "Failed!",
        text: result.message || "Unable to cancel.",
        confirmButtonColor: "#ef4444",
      });
    }
  } catch (error) {
    console.error("Cancel request error:", error);
    Swal.fire({
      icon: "error",
      title: "Server Error",
      text: "Something went wrong. Please try again later.",
      confirmButtonColor: "#ef4444",
    });
  }
});


///////////////////////////////////////return///////////////////////////////

async function openReturnPrompt(orderId, itemId) {
  
  const { value: selectedReason } = await Swal.fire({
    title: "Select Return Reason",
    input: "select",
    inputOptions: {
      "": "-- Choose a reason --",
      "Received damaged product": "Received damaged product",
      "Wrong item delivered": "Wrong item delivered",
      "Item not as described": "Item not as described",
      "Defective or malfunctioning": "Defective or malfunctioning",
      "Missing parts or accessories": "Missing parts or accessories",
      "Other": "Other (type manually)"
    },
    inputPlaceholder: "Choose a reason",
    confirmButtonText: "Next",
    confirmButtonColor: "#16a34a",
    cancelButtonText: "Cancel",
    cancelButtonColor: "#ef4444",
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value) return "Please select a reason.";
    }
  });

  if (!selectedReason) return; 

  let finalReason = selectedReason;

  
  if (selectedReason === "Other") {
    const { value: customReason } = await Swal.fire({
      title: "Return Request",
      input: "textarea",
      inputLabel: "Reason for returning this item",
      inputPlaceholder: "Type your reason here (at least 10 characters)...",
      inputAttributes: { maxlength: 300 },
      showCancelButton: true,
      confirmButtonText: "Submit",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#ef4444",
      preConfirm: (value) => {
        if (!value || value.trim().length < 10) {
          Swal.showValidationMessage("⚠️ Please enter at least 10 characters.");
        }
        return value.trim();
      }
    });

    if (!customReason) return; 
    finalReason = customReason;
  }


  try {
    const response = await fetch(`/order-return/${orderId}/${itemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: finalReason })
    });

    const result = await response.json();

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Return Requested!",
        text: "Your return request has been submitted.",
        confirmButtonColor: "#16a34a"
      }).then(() => window.location.reload());
    } else {
      Swal.fire({
        icon: "error",
        title: "Failed!",
        text: result.message || "Could not process return.",
        confirmButtonColor: "#ef4444"
      });
    }
  } catch (err) {
    console.error("Return request error:", err);
    Swal.fire({
      icon: "error",
      title: "Server Error",
      text: "Something went wrong. Please try again later.",
      confirmButtonColor: "#ef4444"
    });
  }
}

function toggleDetails(orderId) {
  const detailsRow = document.getElementById(`details-${orderId}`);
  const button = event.target;
  
  if (detailsRow) {
    const isHidden = detailsRow.classList.toggle("hidden");
    button.textContent = isHidden ? "View Details" : "Hide Details";
  }
}
