// Modal functions
  function openAddCouponModal() {
    document.getElementById('addCouponModal').classList.remove('hidden');
  }
  function closeAddCouponModal() {
    document.getElementById('addCouponModal').classList.add('hidden');
  }

  // Generate coupon code
  function generateCouponCode() {
    const code = 'COUP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('couponCode').value = code;
  }

  // Toggle discount input
  function toggleDiscountInput() {
    const type = document.getElementById('discountType').value;
    const container = document.getElementById('discountValueContainer');
    const label = document.getElementById('discountLabel');
    const input = document.getElementById('discountValue');

    if (type) {
      container.classList.remove('hidden');
      label.textContent = type === 'percentage' 
        ? 'Discount (%)' 
        : 'Discount (Flat Amount)';
      input.placeholder = type === 'percentage'
        ? 'Enter percentage (e.g. 10 for 10%)'
        : 'Enter flat amount (e.g. 100 for ₹100 off)';
    } else {
      container.classList.add('hidden');
      input.value = '';
    }
  }


function toggleEditDiscountInput() {
  const type = document.getElementById('editDiscountType').value;
  const discountInput = document.getElementById('editDiscountValue');
  const label = document.querySelector('label[for="editDiscountValue"]');

  if (type === 'percentage') {
    discountInput.placeholder = 'Enter percentage (e.g. 10 for 10%)';
    discountInput.max = 100;
    discountInput.min = 1;
  } else if (type === 'flat') {
    discountInput.placeholder = 'Enter flat amount (e.g. 200 for ₹200)';
    discountInput.removeAttribute('max');
    discountInput.removeAttribute('min');
  } else {
    discountInput.placeholder = 'Enter discount value';
  }
}



/////////////////////////adding coupon///////////////////////////////////////////////////


document.getElementById('addCouponForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear previous errors
  const errorFields = document.querySelectorAll('span[id$="Error"]');
  errorFields.forEach(span => (span.textContent = ''));

  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  const code = data.code?.trim();
  const startDate = new Date(data.startDate);
  const expiryDate = new Date(data.expiryDate);
  const minAmount = parseFloat(data.minAmount);
  const maxAmount = parseFloat(data.maxAmount);
  const description = data.description?.trim();

  let isValid = true;

  
  if (!code || code.length < 6 || code.length > 12) {
    document.getElementById('codeError').textContent = 'Coupon code must be 6–12 characters.';
    isValid = false;
  }

  if (isNaN(startDate) || isNaN(expiryDate)) {
    document.getElementById('startDateError').textContent = 'Select both start and expiry dates.';
    isValid = false;
  } else if (expiryDate <= startDate) {
    document.getElementById('expiryDateError').textContent = 'Expiry date must be after start date.';
    isValid = false;
  }

  if (isNaN(minAmount) || minAmount <= 0) {
    document.getElementById('minAmountError').textContent = 'Enter a valid minimum amount.';
    isValid = false;
  }

  if (isNaN(maxAmount) || maxAmount <= 0) {
    document.getElementById('maxAmountError').textContent = 'Enter a valid maximum amount.';
    isValid = false;
  } else if (maxAmount <= minAmount) {
    document.getElementById('maxAmountError').textContent = 'Max amount must be greater than min amount.';
    isValid = false;
  }

  if (!description || description.length < 10) {
    document.getElementById('descriptionError').textContent = 'Description must be at least 10 characters.';
    isValid = false;
  }

  if (!isValid) return;


  try {
    const response = await axios.post('/admin/add-coupon', data);
    const result = response.data;

    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'Coupon Added!',
        text: result.message,
        confirmButtonColor: '#3085d6',
      }).then(() => window.location.reload());
    } else {
      // Show backend validation message in a clear alert
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: result.message || 'Something went wrong while adding coupon.',
        confirmButtonColor: '#d33',
      });
    }
  } catch (error) {
    console.error('Add coupon error:', error);

    
    const backendMessage = error.response?.data?.message || 'Server error while adding coupon.';

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: backendMessage,
      confirmButtonColor: '#d33',
    });
  }
});


//////////////////////////////////toggle coupon////////////////////////////////////////


async function toggleCouponStatus(couponId, isActive) {
  try {
    const response = await axios.put(`/admin/coupons/toggle-status`, { couponId, isActive });
    if (response.data.success) {
      Swal.fire({
        icon: 'success',
        title: `Coupon ${isActive ? 'Activated' : 'Deactivated'}!`,
        showConfirmButton: false,
        timer: 1500
      });
      setTimeout(() => window.location.reload(), 1000);
    } else {
      Swal.fire('Error', response.data.message, 'error');
    }
  } catch (err) {
    Swal.fire('Error', 'Something went wrong', 'error');
  }
}


//////////////////////////////coupon editing//////////////////////////////////////////////

// Open Edit Modal and Fill Data
function openEditCouponModal(coupon) {
  document.getElementById('editCouponId').value = coupon._id;
  document.getElementById('editCouponCode').value = coupon.code;
  document.getElementById('editMinAmount').value = coupon.minPurchaseAmount;
  document.getElementById('editMaxAmount').value = coupon.maxDiscountAmount;
  document.getElementById('editStartDate').value = coupon.startDate.split('T')[0];
  document.getElementById('editExpiryDate').value = coupon.expiryDate.split('T')[0];
  document.getElementById('editDiscountType').value = coupon.discountType;
  document.getElementById('editDiscountValue').value = coupon.discountValue;
  document.getElementById('editDescription').value = coupon.description;

  document.getElementById('editCouponModal').classList.remove('hidden');
}

// Close Modal
function closeEditCouponModal() {
  document.getElementById('editCouponModal').classList.add('hidden');
}


document.getElementById('editCouponForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // === Validation ===
  let isValid = true;

  // Reset previous errors
  document.querySelectorAll('.text-red-500').forEach(el => el.textContent = '');

  // Coupon Code
  if (!data.code || data.code.trim().length <= 6) {
    document.getElementById('editCodeError').textContent = 'Coupon code must be at least 6 characters long.';
    isValid = false;
  }

  // Min Amount
  if (!data.minAmount || isNaN(data.minAmount) || Number(data.minAmount) <= 0) {
    document.getElementById('editMinAmountError').textContent = 'Please enter a valid minimum amount.';
    isValid = false;
  }

  // Max Amount
  if (!data.maxAmount || isNaN(data.maxAmount) || Number(data.maxAmount) <= 0) {
    document.getElementById('editMaxAmountError').textContent = 'Please enter a valid maximum amount.';
    isValid = false;
  } else if (Number(data.maxAmount) < Number(data.minAmount)) {
    document.getElementById('editMaxAmountError').textContent = 'Max amount must be greater than Min amount.';
    isValid = false;
  }

  // Discount Type
  if (!data.discountType) {
    document.getElementById('editDiscountTypeError').textContent = 'Please select a discount type.';
    isValid = false;
  }

  // Discount Value
  if (!data.discount || isNaN(data.discount) || Number(data.discount) <= 0) {
    document.getElementById('editDiscountValueError').textContent = 'Please enter a valid discount value.';
    isValid = false;
  } else if (data.discountType === 'percentage' && (Number(data.discount) > 90)) {
    document.getElementById('editDiscountValueError').textContent = 'Percentage discount cannot exceed 90%.';
    isValid = false;
  }

  // Start Date
  if (!data.startDate) {
    document.getElementById('editStartDateError').textContent = 'Please select a start date.';
    isValid = false;
  }

  // Expiry Date
  if (!data.expiryDate) {
    document.getElementById('editExpiryDateError').textContent = 'Please select an expiry date.';
    isValid = false;
  } else if (new Date(data.expiryDate) <= new Date(data.startDate)) {
    document.getElementById('editExpiryDateError').textContent = 'Expiry date must be after start date.';
    isValid = false;
  }

  // Description
  if (!data.description || data.description.trim().length < 5) {
    document.getElementById('editDescriptionError').textContent = 'Description must be at least 5 characters long.';
    isValid = false;
  }


  // === Submit Form ===
  try {
   
    const response = await axios.post(`/admin/edit-coupon/${data.couponId}`, data);
    const result = response.data;

    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'Coupon Updated!',
        text: result.message,
        confirmButtonColor: '#3085d6',
      }).then(() => window.location.reload());
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: result.message,
        confirmButtonColor: '#d33',
      });
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: error.response?.data?.message || 'Something went wrong!',
    });
  }
});






