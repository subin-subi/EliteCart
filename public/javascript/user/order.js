let cancelOrderId = null;
let cancelItemId = null;

// Data injected from orderDetail.ejs for static script usage
const ORDER_PAGE_DATA = window.__ORDER_PAGE_DATA || {};
const razorpayKey = ORDER_PAGE_DATA.razorpayKey || "";

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

//  Show textarea when "Other" is selected
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
    title: "Return request submitted!",
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  }).then(() => window.location.reload());

} else {
  Swal.fire({
    icon: "error",
    title: result.message || "Could not process return.",
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });
}

 } catch (err) {
  console.error("Return request error:", err);

  Swal.fire({
    icon: "error",
    title: "Something went wrong. Please try again!",
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
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



//////////////////////////////////retry order/////////////////////////

async function retryPayment(orderId) {
  try {
    const res = await axios.post(`/retry-payment/${orderId}`);

    if (res.data.success) {
      const { razorpayOrder, order } = res.data;

      if (!razorpayKey) {
        console.error("Razorpay key missing on order page");
        showToast("Unable to start payment. Please contact support.", "danger");
        return;
      }

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Aromix",
        description: "Retry Payment",
        order_id: razorpayOrder.id,

        handler: async function (response) {
          try {
            const verifyRes = await axios.post('/verify-razorpay-payment', {
              orderId: razorpayOrder.id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              tempOrderId: order._id
            });

            if (verifyRes.data.success) {
              window.location.href = `/order-status/${order._id}`;
            } else {
              await axios.patch(`/payment-failed/${order._id}`);
              window.location.href = `/payment-failed/${order._id}`;
            }

          } catch (err) {
            await axios.patch(`/payment-failed/${order._id}`);
            window.location.href = `/payment-failed/${order._id}`;
          }
        },

        modal: {
          ondismiss: async function () {
            await axios.patch(`/payment-failed/${order._id}`);
            window.location.href = `/payment-failed/${order._id}`;
          }
        },

        theme: { color: "#2e0e46" }
      };

      const rzp = new Razorpay(options);

      rzp.on("payment.failed", async function () {
        await axios.patch(`/payment-failed/${order._id}`);
        window.location.href = `/payment-failed/${order._id}`;
      });

      rzp.open();
    }

  } catch (err) {
    console.error(err);
    showToast(err.response?.data?.message || "Internal Server Error", "danger");
    setTimeout(() => location.reload(), 1500);
  }
}

  