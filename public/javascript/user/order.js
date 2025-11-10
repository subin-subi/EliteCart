  function toggleDetails(orderId) {
      const row = document.getElementById('details-' + orderId);
      row.classList.toggle('hidden');
    }

function openCancelModal(orderId, itemId) {
  const modal = document.getElementById("cancelModal");
  const form = document.getElementById("cancelForm");
  modal.classList.remove("hidden");
  

  form.action = `/item-cancel/${orderId}/${itemId}`;
}

function closeCancelModal() {
  document.getElementById("cancelModal").classList.add("hidden");
}

function validateCancelReason() {
  const reason = document.getElementById("cancelReason").value.trim();
  const errorMsg = document.getElementById("reasonError");

  if (reason.length < 7) {
    errorMsg.classList.remove("hidden");
    return false; n
  }

  errorMsg.classList.add("hidden");
  return true; 
}

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
  document.getElementById("cancelReason").value = "";
}

document.getElementById("confirmCancelBtn").addEventListener("click", async () => {
  const reason = document.getElementById("cancelReason").value.trim();

  // Frontend validation
  if (reason.length < 10) {
    Swal.fire({
      icon: "warning",
      title: "Reason too short",
      text: "Please provide at least 10 characters.",
      confirmButtonColor: "#f87171"
    });
    return;
  }

  try {
    let url = "";
    if (cancelItemId) {
     
      url = `/item-cancel/${cancelOrderId}/${cancelItemId}`;
    } else {
     
      url = `/order-cancel/${cancelOrderId}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });

    const result = await response.json();

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Cancelled!",
        text: result.message || "Your cancellation was successful.",
        confirmButtonColor: "#16a34a"
      }).then(() => window.location.reload());
    } else {
      Swal.fire({
        icon: "error",
        title: "Failed!",
        text: result.message || "Unable to cancel.",
        confirmButtonColor: "#ef4444"
      });
    }
  } catch (error) {
    console.error("Cancel request error:", error);
    Swal.fire({
      icon: "error",
      title: "Server Error",
      text: "Something went wrong. Please try again later.",
      confirmButtonColor: "#ef4444"
    });
  }
});


///////////////////////////////////////return///////////////////////////////

async function openReturnPrompt(orderId, itemId) {
  const { value: reason } = await Swal.fire({
    title: "Return Request",
    input: "textarea",
    inputLabel: "Reason for returning this item",
    inputPlaceholder: "Type your reason here...",
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

  if (reason) {
    try {
      const response = await fetch(`/order-return/${orderId}/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
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
}
