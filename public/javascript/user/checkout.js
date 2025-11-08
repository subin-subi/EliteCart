
let selectedAddressId = null;

function openAddressModal() {
  document.getElementById('addAddressModal').classList.remove('hidden');
}

const addresses = <%- JSON.stringify(addresses || []) %>;
const container = document.getElementById('addressContainer');
const itemsPerPage = 2;
let currentPage = 1;

function renderAddresses() {
  container.innerHTML = '';
  const ordered = [...addresses].reverse();
  const visible = ordered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
          onchange="selectAddress('${addr._id}')"
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

  //////////////////////////////////////////////////////////////
async function submitCheckout() {
  const payment = document.querySelector('input[name="payment"]:checked').value;
  if (!selectedAddressId) {
    alert("⚠️ Please select a shipping address first.");
    return;
  }

   const body = {
      paymentMethod: payment,
      addressId: selectedAddressId,
      productIds: "<%= productIds %>".split(","), 
      variantIds: "<%= variantIds %>".split(","), 
      total: Number(<%= total %>) 
    };


  try {
    const res = await fetch("/place-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok && data.success) {
  Swal.fire({
    title: "✅ Order Placed Successfully!",
    text: "Your order has been placed successfully.",
    icon: "success",
    showCancelButton: true,
    confirmButtonText: "🛒 View Order Details",
    cancelButtonText: "🛍️ Go to Shop",
    reverseButtons: true,
    customClass: {
      popup: "w-[500px] p-6 rounded-2xl", 
      title: "text-2xl font-bold text-green-600", 
      confirmButton: "bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700",
      cancelButton: "bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600"
    },
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = "/orders";
    } else {
      window.location.href = "/product";
    }
  });
} else {
  Swal.fire({
    icon: "error",
    title: "❌ Failed to Place Order",
    text: data.message || "Something went wrong. Please try again.",
    confirmButtonText: "OK",
    customClass: {
      popup: "w-[400px] p-6 rounded-2xl",
      confirmButton: "bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700"
    }
  });
}

  } catch (err) {
    console.error(err);
    alert("❌ Failed to place order. Please try again.");
  }
}

///////////////////////////////coupon adding ///////////////////////////////////



document.addEventListener("DOMContentLoaded", () => {
  const applyBtn = document.getElementById("applyCouponBtn");
  const removeBtn = document.getElementById("removeCouponBtn");
  const couponSelect = document.getElementById("couponSelect");
  const message = document.getElementById("couponMessage");
  const discountSection = document.getElementById("discountSection");
  const discountAmount = document.getElementById("discountAmount");
  const totalElement = document.getElementById("grandTotal");

  let grandTotal = <%= cart.reduce((sum, item) => sum + item.total, 0) + (shippingCost || 0) %>;
  let currentDiscount = 0;
  let finalTotal = grandTotal;

  const currentPage = window.location.pathname;

  // ✅ Check for saved coupon in sessionStorage
  const savedCoupon = JSON.parse(sessionStorage.getItem("appliedCoupon") || "{}");

  // ✅ Only restore if same page
  if (savedCoupon.page === currentPage) {
    applyCouponLogic(savedCoupon.couponCode, savedCoupon.discountValue, savedCoupon.discountType);
    setSelectedCoupon(savedCoupon.couponCode);
  } else {
    // Clear if coupon was for another route
    sessionStorage.removeItem("appliedCoupon");
  }

  // ✅ Function to set dropdown value
  function setSelectedCoupon(code) {
    for (let i = 0; i < couponSelect.options.length; i++) {
      if (couponSelect.options[i].value === code) {
        couponSelect.selectedIndex = i;
        break;
      }
    }
  }

  // ✅ Function to apply coupon
  function applyCouponLogic(code, discountValue, discountType) {
    discountValue = parseFloat(discountValue || 0);
    currentDiscount =
      discountType === "percentage"
        ? Math.floor((grandTotal * discountValue) / 100)
        : discountValue;

    if (currentDiscount > grandTotal) currentDiscount = grandTotal;

    finalTotal = grandTotal - currentDiscount;
    discountAmount.textContent = `- ₹${currentDiscount.toFixed(2)}`;
    discountSection.classList.remove("hidden");

    message.textContent = `Coupon "${code}" applied successfully!`;
    message.classList.remove("hidden", "text-red-600");
    message.classList.add("text-green-600");

    applyBtn.classList.add("hidden");
    removeBtn.classList.remove("hidden");

    totalElement.textContent = `₹${finalTotal.toFixed(2)}`;
  }

  // ✅ Apply button click
  applyBtn.addEventListener("click", () => {
    const selected = couponSelect.options[couponSelect.selectedIndex];
    const code = selected.value;
    const discountValue = selected.dataset.discount;
    const discountType = selected.dataset.type;

    if (!code) {
      message.textContent = "Please select a coupon.";
      message.classList.remove("hidden", "text-green-600");
      message.classList.add("text-red-600");
      return;
    }

    applyCouponLogic(code, discountValue, discountType);

    // Store only for current checkout page
    sessionStorage.setItem(
      "appliedCoupon",
      JSON.stringify({ page: currentPage, couponCode: code, discountValue, discountType })
    );
  });

  // ✅ Remove button click
  removeBtn.addEventListener("click", () => {
    currentDiscount = 0;
    finalTotal = grandTotal;
    sessionStorage.removeItem("appliedCoupon");

    discountSection.classList.add("hidden");
    message.textContent = "Coupon removed successfully!";
    message.classList.remove("hidden", "text-red-600");
    message.classList.add("text-green-600");

    removeBtn.classList.add("hidden");
    applyBtn.classList.remove("hidden");
    couponSelect.value = "";

    totalElement.textContent = `₹${grandTotal.toFixed(2)}`;
  });

  // ✅ Optional: Auto-clear coupon when user leaves checkout route
  window.addEventListener("beforeunload", () => {
    const path = window.location.pathname;
    if (!path.includes("checkout")) {
      sessionStorage.removeItem("appliedCoupon");
    }
  });
});

