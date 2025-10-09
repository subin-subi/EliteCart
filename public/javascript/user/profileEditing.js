
    const modal = document.getElementById('editModal');
    const editBtn = document.getElementById('editProfileBtn');
    const closeModal = document.getElementById('closeModal');
    const addNumberLink = document.getElementById('addNumberLink');

    const profileInput = document.getElementById('profileImageInput');
    const cropContainer = document.getElementById('cropContainer');
    const cropImage = document.getElementById('cropImage');
    const cropBtn = document.getElementById('cropBtn');
    const profilePreview = document.getElementById('profilePreview');
    let cropper;

    // Open modal
    const openModal = () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    };

    if (editBtn) editBtn.addEventListener('click', openModal);
    if (addNumberLink) addNumberLink.addEventListener('click', openModal);

    // Close modal
    closeModal.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });

    // Close on outside click
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });



profileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      cropImage.src = reader.result;
      cropContainer.classList.remove("hidden");
      if (cropper) cropper.destroy();
      cropper = new Cropper(cropImage, {
        aspectRatio: 1,
        viewMode: 2,
        background: false,
        movable: true,
        zoomable: true,
        rotatable: false,
        responsive: true,
        autoCropArea: 1
      });
    };
    reader.readAsDataURL(file);
  }
});

const cancelCropBtn = document.getElementById("cancelCropBtn");
cancelCropBtn.addEventListener("click", () => {
  cropContainer.classList.add("hidden");
  if (cropper) cropper.destroy();
  cropper = null;
});

cropBtn.addEventListener("click", () => {
  if (cropper) {
    const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
    const croppedBase64 = canvas.toDataURL();

    // Update preview and hidden input
    profilePreview.src = croppedBase64;
    document.getElementById("croppedImageInput").value = croppedBase64;

    cropContainer.classList.add("hidden");
    cropper.destroy();
    cropper = null;
  }
});




///////////////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", () => {
  const otpModal = document.getElementById("otpModal");
  const verifyOtpBtn = document.getElementById("verifyOtp");
  const resendOtpBtn = document.getElementById("resendOtp");
  const otpInputs = document.querySelectorAll(".otp-input");
  const otpError = document.getElementById("otpError");
  const otpLoadingSpinner = document.getElementById("otp-loading-spinner");
  const editProfileForm = document.getElementById("editProfileForm");
  const originalEmail = document.getElementById("emailInput").value.trim();

  let pendingFormData = null;
  let otpTimerInterval;

  // ----------------------- OTP TIMER -----------------------
  const startOTPTimer = (seconds) => {
    const timerDisplay = document.getElementById("timerDisplay");
    if (otpTimerInterval) clearInterval(otpTimerInterval);

    const updateTimer = () => {
      const min = String(Math.floor(seconds / 60)).padStart(2, "0");
      const sec = String(seconds % 60).padStart(2, "0");
      timerDisplay.textContent = `${min}:${sec}`;
      if (seconds <= 0) {
        clearInterval(otpTimerInterval);
        timerDisplay.textContent = "00:00";
        timerDisplay.classList.add("text-red-600");
        resendOtpBtn.classList.remove("hidden");
      }
      seconds--;
    };

    updateTimer();
    otpTimerInterval = setInterval(updateTimer, 1000);
  };

  // ----------------------- OTP INPUT AUTO MOVE -----------------------
  otpInputs.forEach((input, i) => {
    input.addEventListener("input", () => {
      if (input.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && i > 0) otpInputs[i - 1].focus();
    });
  });

  // ----------------------- FORM SUBMIT -----------------------
editProfileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("nameInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const phone = document.getElementById("phoneInput").value.trim();
  const croppedImageBase64 = document.getElementById("croppedImageInput").value;

  //  validation
  const nameValid = name.length >= 3 && /^[a-zA-Z\s.]+$/.test(name);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = !phone || /^[1-9][0-9]{9}$/.test(phone);

  document.getElementById("nameError").classList.toggle("hidden", nameValid);
  document.getElementById("emailError").classList.toggle("hidden", emailValid);
  document.getElementById("phoneError").classList.toggle("hidden", phoneValid);

  if (!nameValid || !emailValid || !phoneValid) return;

 
  if (email !== originalEmail) {
  try {
    const { data } = await axios.post("/sendotp", { email }, { withCredentials: true });

    if (data.success) {
      

      // Hide edit modal
      modal.classList.add("hidden");
      modal.classList.remove("flex");

      // Show OTP modal
      otpModal.classList.remove("hidden");
      otpModal.classList.add("flex");

      // Start OTP timer
      startOTPTimer(120);

      // Save form data to submit after OTP verification
      pendingFormData = new FormData(editProfileForm);
    } else {
      Swal.fire("Error", data.message || "Failed to send OTP", "error");
    }
  } catch (error) {
    console.error("Send OTP Error:", error);
    const msg = error.response?.data?.message || "Failed to send OTP";
    Swal.fire("Error", msg, "error");
  }
  return;
}

  // If email is NOT changed → directly update
  await submitProfileForm(editProfileForm, croppedImageBase64);
});

  // ----------------------- VERIFY OTP -----------------------
 verifyOtpBtn.addEventListener("click", async () => {
  const otp = Array.from(otpInputs).map((i) => i.value).join("");

  if (otp.length !== 6) {
    otpError.textContent = "Enter a 6-digit OTP.";
    otpError.classList.remove("hidden");
    return;
  }

  otpLoadingSpinner.classList.remove("hidden");

  try {
    const { data } = await axios.post(
      "/validateOtp",
      { otp }, // only send OTP
      { withCredentials: true }
    );

    otpLoadingSpinner.classList.add("hidden");

    if (data.success) {
      otpModal.classList.add("hidden");
      otpModal.classList.remove("flex");
      Swal.fire("Verified!", "OTP verified successfully!", "success");

      // ✅ Continue updating profile after OTP success
      await submitProfileForm(pendingFormData);
    } else {
      otpError.textContent = data.message || "Invalid or expired OTP.";
      otpError.classList.remove("hidden");
      otpInputs.forEach((i) => (i.value = ""));
      otpInputs[0].focus();
    }
  }catch (err) {
  otpLoadingSpinner.classList.add("hidden");

  // Get error message from server if available
  const msg = err.response?.data?.message || "Error verifying OTP.";
  otpError.textContent = msg;
  otpError.classList.remove("hidden");

  // Clear inputs
  otpInputs.forEach((i) => (i.value = ""));
  otpInputs[0].focus();
}
});

  // ----------------------- RESEND OTP -----------------------
  resendOtpBtn.addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  try {
    const { data } = await axios.post(
      "/resendOtp", 
      { email }, 
      { withCredentials: true });

    if (data.success) {
      Swal.fire("Sent", "OTP resent successfully!", "success");
      startOTPTimer(120);  // 
      resendOtpBtn.classList.add("hidden");  // 
    } else {
      Swal.fire("Error", data.message || "Failed to resend OTP", "error");
    }
  } catch {
    Swal.fire("Error", "Something went wrong while resending OTP", "error");
  }
});

});

// ----------------------- SUBMIT PROFILE FORM FUNCTION -----------------------
async function submitProfileForm(formOrFormData) {
  try {
    let formData;

  if (formOrFormData instanceof FormData) {
    formData = formOrFormData; // Use already-prepared FormData
  } else {
    formData = new FormData(formOrFormData); // Create FormData from form element
  }
    const croppedImageBase64 = document.getElementById("croppedImageInput").value;
    if (croppedImageBase64) formData.append("croppedImage", croppedImageBase64);

    const { data } = await axios.post("/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
    });

    if (data.success) {
      Swal.fire("Success", "Profile updated successfully!", "success").then(() => {
        window.location.reload();
      });
    } else {
      Swal.fire("Error", data.message || "Failed to update profile", "error");
    }
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Something went wrong while updating profile", "error");
  }
}

window.addEventListener('click', (e) => {
  if (e.target === modal && !otpModal.classList.contains('flex')) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
});
