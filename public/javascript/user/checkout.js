
let selectedAddressId = null;

function openAddressModal() {
  document.getElementById('addAddressModal').classList.remove('hidden');
}

// Read server-provided data injected by checkout.ejs
const CHECKOUT_DATA = (window.__CHECKOUT_DATA || {});
const addresses = Array.isArray(CHECKOUT_DATA.addresses) ? CHECKOUT_DATA.addresses : [];
const cartData = Array.isArray(CHECKOUT_DATA.cart) ? CHECKOUT_DATA.cart : [];
const userData = CHECKOUT_DATA.user || { name: "", email: "" };
const razorpayKey = CHECKOUT_DATA.razorpayKey || "";

const container = document.getElementById('addressContainer');
const itemsPerPage = 2;
let currentPage = 1;

function renderAddresses() {
  container.innerHTML = '';
  const ordered = [...addresses].reverse();
  const visible = ordered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  if (selectedAddressId) {
  const radio = document.querySelector(`input[value='${selectedAddressId}']`);
  if (radio) {
    radio.checked = true;
    const selectedCard = radio.closest('div.relative');
    selectedCard.classList.add('border-green-600', 'bg-green-50');
  }
}


  visible.forEach(addr => {
    const div = document.createElement('div');
    div.className = `
      relative bg-[#e6f2ef] rounded-lg p-4 w-[45%] shadow-md 
      hover:shadow-lg transition border-2 border-transparent
    `;
    div.innerHTML = `
      <div class="absolute top-3 right-3">
        <input 
          type="radio" 
          name="selectedAddress" 
          value="${addr._id}" 
          onchange="window.selectAddress('${addr._id}')"
          class="w-4 h-4 cursor-pointer accent-green-600"
        >
      </div>
      <div class="text-sm leading-6 text-gray-700 mt-3">
        <p class="font-semibold">${addr.name}</p>
        <p>${addr.houseName}, ${addr.street}</p>
        <p>${addr.city}, ${addr.state}, ${addr.country}</p>
        <p>PIN: ${addr.pincode}</p>
        <p>Contact: ${addr.mobile}</p>
      </div>
      <button 
        onclick='editAddress(${JSON.stringify(addr)})'
        class="absolute bottom-3 right-3 bg-black text-white text-xs px-4 py-1 rounded-full hover:bg-gray-800 transition"
      >
        Edit
      </button>
    `;
    container.appendChild(div);
  });
}

document.getElementById('nextBtn').addEventListener('click', () => {
  if (currentPage * itemsPerPage < addresses.length) {
    currentPage++;
    renderAddresses();
  }
});

document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderAddresses();
  }
});

renderAddresses();

async function selectAddress(addressId) {
  selectedAddressId = addressId;
  document.querySelectorAll('#addressContainer > div').forEach(div => {
    div.classList.remove('border-green-600', 'bg-green-50');
    div.classList.add('border-transparent');
  });

  const selectedCard = document.querySelector(`input[value='${addressId}']`).closest('div.relative');
  if (selectedCard) {
    selectedCard.classList.add('border-green-600', 'bg-green-50');
  }

  try {
    const res = await axios.post('/select-address', { addressId });

    if (res.data.success) showToast('✅ Address selected successfully!', 'success');
  } catch (err) {
     console.error(err);
      showToast('❌ Failed to select address.', 'error');
  }
}



function showToast(message, type = 'success') {
  // Create toast div
  const toast = document.createElement('div');
  toast.textContent = message;

  // Style for toast
  toast.className = `fixed bottom-5 right-5 px-4 py-2 rounded-md shadow-lg text-white text-sm transition-all duration-500 z-50 ${
    type === 'success' ? 'bg-green-600' : 'bg-red-600'
  }`;

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}




///////////////////////////////////checkout ........../////////////////////////////////

async function placeOrder() {
  const cart = cartData;

  
 const selectedAddress = document.querySelector("input[name='selectedAddress']:checked");
const selectedAddressId = selectedAddress ? selectedAddress.value : null;

  const selectedPayment = document.querySelector("input[name=paymentMethod]:checked");

  
  // ======= VALIDATION =======
  if (!selectedAddressId) {
    showToast("Please select an address before placing the order.", "warning");
    return;
  }

  if (!selectedPayment) {
    showToast("Please select a payment method.", "warning");
    return;
  }

  const paymentMethod = selectedPayment.value;
  const couponSelect = document.getElementById("couponSelect");
  const coupon = couponSelect ? couponSelect.value.trim() : "";

  // ======= COD PAYMENT =======
if (paymentMethod === "cod") {
  try {
    console.log("COD order payload:", { cart, selectedAddressId, paymentMethod, coupon });

    const { data } = await  axios.post("/checkout/order-cod", {
      cart,
      selectedAddressId,
      paymentMethod,
      coupon,
    });

    if (data.success) {
      showToast(data.message, "success");
      sessionStorage.removeItem("coupon");
      setTimeout(() => {
        window.location.href = data.redirect;
      }, 2000);
    } else {
      showToast(data.message || "Order failed.", "danger");
    }
  } catch (err) {
    console.error("Error placing order:", err);
    showToast("Something went wrong. Please try again.", "danger");
  }
}

  // ======= RAZORPAY PAYMENT =======
  else if (paymentMethod === "razorpay") {
    try {
      // Get the current grand total from the page
      const grandTotalElement = document.getElementById("grandTotal");
      const grandTotalText = grandTotalElement.textContent.replace(/[₹,\s]/g, '');
      const grandTotal = parseFloat(grandTotalText) || 0;

      const res = await fetch("/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, selectedAddressId, paymentMethod, coupon }),
      });

      const data = await res.json();

      if (data.success) {
        const { order, tempOrderId } = data;
        console.log(order.amount)

        // Validate tempOrderId exists
        if (!tempOrderId) {
          showToast("Error: Order ID not found. Please try again.", "danger");
          return;
        }

        const options = {
          key: razorpayKey,
          amount: order.amount,
          currency: order.currency,
          name: "EliteCart",
          description: "Order Payment",
          order_id: order.id,
          handler: async function (response) {
            try {
              const verifyRes = await fetch("/verify-razorpay-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: order.id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  tempOrderId,
                }),
              });

              const verifyData = await verifyRes.json();

              if (verifyData.success) {
                sessionStorage.removeItem("coupon");
                window.location.href = `/order-status/${verifyData.orderId}`;
              } else {
                // Use tempOrderId if verifyData.orderId is not available
                const orderIdToUse = verifyData.orderId || tempOrderId;
                if (orderIdToUse) {
                  try {
                    await fetch(`/payment-failed/${orderIdToUse}`, { method: "PATCH" });
                  } catch (e) {
                    console.error("Error updating payment status:", e);
                  }
                  window.location.href = `/payment-failed/${orderIdToUse}`;
                } else {
                  showToast("Payment verification failed. Please contact support.", "danger");
                }
              }
            } catch (err) {
              console.error("Payment verification error:", err);
              // Use tempOrderId for error handling
              if (tempOrderId) {
                try {
                  await fetch(`/payment-failed/${tempOrderId}`, { method: "PATCH" });
                } catch (e) {
                  console.error("Error updating payment status:", e);
                }
                window.location.href = `/payment-failed/${tempOrderId}`;
              } else {
                showToast("Payment failed. Please contact support with order details.", "danger");
              }
            }
          },
          prefill: {
            name: userData.name || "",
            email: userData.email || "",
          },
          theme: { color: "#2e0e46" },
          modal: {
            ondismiss: async function () {
              if (tempOrderId) {
                try {
                  await fetch(`/payment-failed/${tempOrderId}`, { method: "PATCH" });
                } catch (e) {
                  console.error("Error updating payment status:", e);
                }
                window.location.href = `/payment-failed/${tempOrderId}`;
              } else {
                showToast("Payment cancelled. Please try again.", "warning");
              }
            },
          },
        };

        const rzp = new window.Razorpay(options);

        rzp.on("payment.failed", async function (response) {
          if (tempOrderId) {
            try {
              await fetch(`/payment-failed/${tempOrderId}`, { method: "PATCH" });
            } catch (e) {
              console.error("Error updating payment status:", e);
            }
            window.location.href = `/payment-failed/${tempOrderId}`;
          } else {
            showToast("Payment failed. Please contact support.", "danger");
          }
        });

        rzp.open();
      } else {
        showToast(data.message || "Unable to create Razorpay order.", "danger");
      }
    } catch (err) {
      console.error("Razorpay error:", err);
      showToast("Some Error in Razorpay", "danger");
    }
  }

  // ======= WALLET PAYMENT =======
  else if (paymentMethod === "wallet") {
    try {
      const res = await fetch("/wallet-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, selectedAddressId, paymentMethod, coupon }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message, "success");
        sessionStorage.removeItem("coupon");

        setTimeout(() => {
          window.location.href = data.redirect;
        }, 2000);
      } else {
        showToast(data.message || "Wallet payment failed.", "danger");
      }
    } catch (err) {
      console.error("Error placing order:", err);
      showToast("Something went wrong. Please try again.", "danger");
    }
  }
}




  function showToast(message, type = "info") {
    const icon = type === "success" ? "success"
               : type === "danger" ? "error"
               : type === "warning" ? "warning"
               : "info";

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: icon,
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    });
  }


//////////////////////////////////coupon///////////////////////////////////////////////


document.addEventListener("DOMContentLoaded", () => {
  const couponSelect = document.getElementById("couponSelect");
  const applyCouponBtn = document.getElementById("applyCouponBtn");
  const removeCouponBtn = document.getElementById("removeCouponBtn");
  const couponMessage = document.getElementById("couponMessage");

  // Grand total (with shipping)
  let grandTotal = parseFloat(document.getElementById("grandTotal").textContent.replace(/[₹,]/g, ""));
  let originalTotal = grandTotal;
  let appliedCoupon = null;
  let appliedDiscount = 0;

  // Apply coupon
  applyCouponBtn.addEventListener("click", async () => {
    const selectedOption = couponSelect.options[couponSelect.selectedIndex];
    const code = selectedOption.value;

    if (!code) {
      showMessage("Please select a coupon first.", "red");
      return;
    }

    try {
      // ✅ Get subtotal (without shipping)
      const subtotalText = document.getElementById("subtotalAmount").textContent.replace(/[₹,]/g, "").trim();
      const subtotal = parseFloat(subtotalText) || 0;

      // ✅ Send only subtotal to backend
      const res = await axios.post("/coupon/apply", { code, total: subtotal });

      if (res.data.success) {
        appliedCoupon = code;
        appliedDiscount = res.data.discountAmount || 0; // backend should send discountAmount

        // ✅ Don't modify grand total display
        // Just show discount section & message
        document.getElementById("discountSection").classList.remove("hidden");
        document.getElementById("discountAmount").textContent = `- ₹${appliedDiscount.toFixed(2)}`;
        showMessage(`Coupon "${code}" applied successfully!`, "green");

        applyCouponBtn.classList.add("hidden");
        removeCouponBtn.classList.remove("hidden");
      } else {
        showMessage(res.data.message || "Invalid or expired coupon.", "red");
      }
    } catch (err) {
      console.error("Coupon apply error:", err);
      const message = err.response?.data?.message || "Error applying coupon.";
      showMessage(message, "red");
    }
  });

  // Remove coupon
  removeCouponBtn.addEventListener("click", () => {
    if (!appliedCoupon) return;

    appliedCoupon = null;
    appliedDiscount = 0;

    // ✅ Hide discount section again
    document.getElementById("discountSection").classList.add("hidden");
    document.getElementById("discountAmount").textContent = "- ₹0.00";
    showMessage("Coupon removed.", "red");

    removeCouponBtn.classList.add("hidden");
    applyCouponBtn.classList.remove("hidden");
    couponSelect.value = "";
  });

  // Show message function
  function showMessage(text, color = "green") {
    couponMessage.textContent = text;
    couponMessage.classList.remove("hidden");
    couponMessage.style.color = color === "green" ? "#16a34a" : "#dc2626";
  }
});

