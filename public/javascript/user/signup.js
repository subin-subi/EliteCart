document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const otpModal = document.getElementById('otpModal');
  const loadingSpinner = document.getElementById('loading-spinner');
  const otpLoadingSpinner = document.getElementById('otp-loading-spinner');
  const otpInputs = document.querySelectorAll('.otp-input');
  const otpError = document.getElementById('otpError');
  const generalError = document.getElementById('generalError');

  // Helper: show error message and red border
  const showError = (elementId, message) => {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    document.getElementById(elementId.replace('Error', '')).classList.add('border-red-500');
  };

  // Helper: hide error message and border
  const hideError = (elementId) => {
    const errorElement = document.getElementById(elementId);
    errorElement.classList.add('hidden');
    document.getElementById(elementId.replace('Error', '')).classList.remove('border-red-500');
  };

  // OTP Timer function
  let otpTimerInterval;
  const startOTPTimer = (seconds) => {
    const timerDisplay = document.getElementById('timerDisplay');
    const otpTimer = document.getElementById('otpTimer');
    
    // Clear any existing timer
    if (otpTimerInterval) {
      clearInterval(otpTimerInterval);
    }
    
    // Show timer
    otpTimer.classList.remove('hidden');
    
    const updateTimer = () => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const display = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      
      timerDisplay.textContent = display;
      
      if (seconds <= 0) {
        clearInterval(otpTimerInterval);
        timerDisplay.textContent = '00:00';
        timerDisplay.classList.add('text-red-600');
        timerDisplay.classList.remove('text-green-600');
      } else if (seconds <= 30) {
        timerDisplay.classList.add('text-red-600');
        timerDisplay.classList.remove('text-green-600');
      } else {
        timerDisplay.classList.add('text-green-600');
        timerDisplay.classList.remove('text-red-600');
      }
      
      seconds--;
    };
    
    updateTimer(); // Initial call
    otpTimerInterval = setInterval(updateTimer, 1000);
  };

  const stopOTPTimer = () => {
    if (otpTimerInterval) {
      clearInterval(otpTimerInterval);
      otpTimerInterval = null;
    }
  };

  // Password validation
  const validatePassword = (password) => {
    const minLength = 8;
    const maxLength = 12;

    if (password.length < minLength || password.length > maxLength) {
      return { isValid: false, message: `Password must be between ${minLength} and ${maxLength} characters long` };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }
    return { isValid: true };
  };

  // Real-time validation for name
  document.getElementById('name').addEventListener('input', function () {
    const value = this.value.trim();
    if (value.length < 3 || value.length > 10) {
      showError('nameError', 'Name must be between 3 and 10 characters');
    } else if (!/^[a-zA-Z\s]+$/.test(value)) {
      showError('nameError', 'Name can only contain letters and spaces');
    } else {
      hideError('nameError');
    }
  });

  // Real-time validation for email
  document.getElementById('email').addEventListener('input', function () {
    const value = this.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      showError('emailError', 'Please enter a valid email address');
    } else {
      hideError('emailError');
    }
  });

  // Real-time validation for mobileNo
  document.getElementById('mobileNo').addEventListener('input', function () {
    const value = this.value.trim();
    if (!/^\d{10}$/.test(value)) {
      showError('mobileNoError', 'Mobile number must be 10 digits');
    } else {
      hideError('mobileNoError');
    }
  });

  // Real-time validation for password
  document.getElementById('password').addEventListener('input', function () {
    const value = this.value;
    const validation = validatePassword(value);
    if (!validation.isValid) {
      showError('passwordError', validation.message);
    } else {
      hideError('passwordError');
    }
  });

  // Real-time validation for confirmPassword
  document.getElementById('confirmPassword').addEventListener('input', function () {
    const password = document.getElementById('password').value;
    if (this.value !== password) {
      showError('confirmPasswordError', 'Passwords do not match');
    } else {
      hideError('confirmPasswordError');
    }
  });

  // Password toggle visibility
  document.getElementById('togglePassword').addEventListener('click', function () {
    const input = document.getElementById('password');
    const icon = this.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });

  document.getElementById('toggleConfirmPassword').addEventListener('click', function () {
    const input = document.getElementById('confirmPassword');
    const icon = this.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    }
  });

  // OTP inputs navigation
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', function () {
      if (this.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !this.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });

  // Form submit handler
 form.addEventListener('submit', async function (e) {
  e.preventDefault();
  let hasErrors = false;

  // Clear previous errors
  const errorElements = document.querySelectorAll('[id$="Error"]');
  errorElements.forEach(el => el.classList.add('hidden'));

  generalError.classList.add('hidden');

  const name = document.getElementById('name').value.trim();
  const mobileNo = document.getElementById('mobileNo').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const redeemCode = document.getElementById('redeemCode')?.value.trim(); // ✅ optional field

  // Validation
  if (!name || name.length < 3 || name.length > 10) {
    showError('nameError', 'Name must be between 3 and 10 characters');
    hasErrors = true;
  } else if (!/^[a-zA-Z\s]+$/.test(name)) {
    showError('nameError', 'Name can only contain letters and spaces');
    hasErrors = true;
  }

  if (!/^\d{10}$/.test(mobileNo)) {
    showError('mobileNoError', 'Mobile number must be 10 digits');
    hasErrors = true;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('emailError', 'Please enter a valid email address');
    hasErrors = true;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    showError('passwordError', passwordValidation.message);
    hasErrors = true;
  }

  if (password !== confirmPassword) {
    showError('confirmPasswordError', 'Passwords do not match');
    hasErrors = true;
  }

  if (hasErrors) return;

  // Disable submit button and show loading spinner
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  loadingSpinner.classList.remove('hidden');

  try {
    const response = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mobileNo,
        email,
        password,
        redeemCode: redeemCode || null, // ✅ Include redeem code if present
      }),
    });

    const data = await response.json();

    loadingSpinner.classList.add('hidden');
    submitButton.disabled = false;

    if (data.success) {
      // Clear OTP inputs and errors
      otpInputs.forEach(input => input.value = '');
      otpError.classList.add('hidden');
      otpInputs[0].focus();

      // Show OTP modal
      otpModal.classList.remove('hidden');
      otpModal.classList.add('flex');

      // Start OTP timer (2 minutes = 120 seconds)
      startOTPTimer(120);
    } else {
      generalError.textContent = data.message || 'Signup failed';
      generalError.classList.remove('hidden');
    }
  } catch (error) {
    loadingSpinner.classList.add('hidden');
    submitButton.disabled = false;
    console.error('Signup error:', error);
    generalError.textContent = 'Something went wrong! Please try again.';
    generalError.classList.remove('hidden');
  }
});


  // OTP verification button
  document.getElementById('verifyOtp').addEventListener('click', async () => {
    const otp = Array.from(otpInputs).map(input => input.value).join('');
    const email = document.getElementById('email').value;

    console.log('Sending OTP verification:', { otp, email });

    otpError.classList.add('hidden');
    otpLoadingSpinner.classList.remove('hidden');

    try {
      const response = await fetch('/validate-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userOtp: otp, email }),
      });

      const data = await response.json();
      console.log('OTP verification response:', data);

      otpLoadingSpinner.classList.add('hidden');

      if (data.success) {
        // Stop the timer
        stopOTPTimer();
        
        // Redirect after successful OTP verification
        window.location.href = data.redirectUrl || '/';
      } else {
        otpError.textContent = data.error || 'Invalid OTP';
        otpError.classList.remove('hidden');
        otpInputs.forEach(input => input.value = '');
        otpInputs[0].focus();
        
        // Debug: Check current OTP status
        try {
          const debugResponse = await fetch(`/debug-otp/${encodeURIComponent(email)}`);
          const debugData = await debugResponse.json();
          console.log('Debug OTP status:', debugData);
        } catch (debugError) {
          console.error('Debug request failed:', debugError);
        }
      }
    } catch (error) {
      otpLoadingSpinner.classList.add('hidden');
      otpError.textContent = 'Failed to verify OTP';
      otpError.classList.remove('hidden');
      console.error('OTP verification error:', error);
    }
  });

  // Resend OTP button
  document.getElementById('resendOtp').addEventListener('click', async function () {
    const email = document.getElementById('email').value;
    const resendButton = this;
    const resendMessage = document.getElementById('resendMessage');
    const resendTimer = document.getElementById('resendTimer');

    resendButton.disabled = true;
    resendMessage.classList.add('hidden');
    resendTimer.classList.add('hidden');
    otpError.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');

    try {
      const response = await fetch('/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      loadingSpinner.classList.add('hidden');

      resendMessage.textContent = data.message || '';
      resendMessage.style.color = data.success ? '#065F46' : '#9B1C1C';
      resendMessage.classList.remove('hidden');

      if (data.success) {
        // Restart OTP timer
        startOTPTimer(120);
        
        let timeLeft = 60;
        resendTimer.classList.remove('hidden');

        const countdownInterval = setInterval(() => {
          resendTimer.textContent = `Resend available in ${timeLeft}s`;
          timeLeft--;

          if (timeLeft < 0) {
            clearInterval(countdownInterval);
            resendButton.disabled = false;
            resendTimer.classList.add('hidden');
            resendMessage.classList.add('hidden');
          }
        }, 1000);
      } else {
        resendButton.disabled = false;
      }
    } catch (error) {
      loadingSpinner.classList.add('hidden');
      resendButton.disabled = false;
      resendMessage.textContent = 'Failed to resend OTP';
      resendMessage.style.color = '#9B1C1C';
      resendMessage.classList.remove('hidden');
      console.error('Resend OTP error:', error);
    }
  });

  
  const closeOtpModalBtn = document.getElementById('closeOtpModal');
  if (closeOtpModalBtn) {
    closeOtpModalBtn.addEventListener('click', () => {
      otpModal.classList.add('hidden');
      otpModal.classList.remove('flex');
    });
  }
});


/////////////////////////otp copy past //////////////
const otpInputs = document.querySelectorAll(".otp-input");

otpInputs.forEach((input, index) => {
  // Allow only numbers
  input.addEventListener("input", (e) => {
    const value = e.target.value.replace(/\D/g, ""); // remove non-digits
    e.target.value = value;

    if (value && index < otpInputs.length - 1) {
      otpInputs[index + 1].focus();
    }
  });

  // Handle backspace
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && input.value === "" && index > 0) {
      otpInputs[index - 1].focus();
    }
  });
});

//  Handle paste on any OTP box
otpInputs[0].parentElement.addEventListener("paste", (e) => {
  e.preventDefault();
  const pasteData = e.clipboardData.getData("text").trim();
  const digits = pasteData.replace(/\D/g, ""); // Only numbers

  if (!digits) return;

  // Fill each input
  otpInputs.forEach((inp, i) => {
    inp.value = digits[i] || "";
  });

  // Move focus to last filled
  const filledIndex = Math.min(digits.length, otpInputs.length) - 1;
  if (filledIndex >= 0) otpInputs[filledIndex].focus();
});
