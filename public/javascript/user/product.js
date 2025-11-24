document.addEventListener("DOMContentLoaded", () => {
  /* ------------------------------------------------------------
      ELEMENT REFERENCES
  ------------------------------------------------------------ */
  const desc = document.getElementById("productDescription");
  const toggleBtn = document.getElementById("toggleDescription");
  const variantSection = document.getElementById("variantSection");
  const cartSection = document.getElementById("cartSection");

  const variantSelect = document.getElementById("variantSelect");
  const mainImage = document.getElementById("mainImage");
  const thumbnailsContainer = document.getElementById("thumbnails");

  const priceSection = document.getElementById("priceSection");
  const addToCartBtn = document.getElementById("addToCartBtn");
  const outOfStockBtn = document.getElementById("outOfStockBtn");

  const wishlistBtn = document.getElementById("wishlistBtn");
  const heartIcon = document.getElementById("heartIcon");

  // All variants passed from EJS
  const allVariants = window.allVariants || [];

  /* ------------------------------------------------------------
      DESCRIPTION TOGGLE
  ------------------------------------------------------------ */
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const expanded = !desc.classList.contains("line-clamp-3");

      if (expanded) {
        desc.classList.add("line-clamp-3");
        toggleBtn.textContent = "Read more";
        variantSection?.classList.remove("hidden");
        cartSection?.classList.remove("hidden");
      } else {
        desc.classList.remove("line-clamp-3");
        toggleBtn.textContent = "Show less";
        variantSection?.classList.add("hidden");
        cartSection?.classList.add("hidden");
      }
    });
  }

  /* ------------------------------------------------------------
      VARIANT CHANGE → Update Images + Price + Stock
  ------------------------------------------------------------ */
  if (variantSelect) {
    variantSelect.addEventListener("change", (e) => {
      const selectedVariantId = e.target.value;
      const selectedVariant = allVariants.find(
        (v) => v._id === selectedVariantId
      );

      if (!selectedVariant) return;

      // Update addToCart button
      addToCartBtn.dataset.variant = selectedVariantId;

      /* ---------- Update Main Image ---------- */
      mainImage.src = selectedVariant.mainImage || "/images/placeholder.png";

      /* ---------- Update Thumbnail Images ---------- */
      thumbnailsContainer.innerHTML = "";

      if (selectedVariant.subImages?.length > 0) {
        selectedVariant.subImages.forEach((img, idx) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className =
            "thumbnail w-full h-20 sm:h-28 md:h-32 rounded-lg overflow-hidden border-2 border-transparent";
          button.dataset.src = img;
          button.innerHTML = `<img src="${img}" class="w-full h-full object-cover">`;
          button.addEventListener("click", () => (mainImage.src = img));
          thumbnailsContainer.appendChild(button);
        });
      } else {
        thumbnailsContainer.innerHTML = `<p class="text-gray-500 text-sm">No images available</p>`;
      }

      /* ---------- Price Section ---------- */
      const price = parseFloat(selectedVariant.price);
      const discount = selectedVariant.discountPrice || null;
      const stock = selectedVariant.stock;

      let html = "";

      if (discount && discount < price) {
        const discountPercent = Math.round(((price - discount) / price) * 100);
        html = `
          <span class="text-2xl sm:text-3xl font-semibold text-red-600">₹${discount.toLocaleString()}</span>
          <span class="text-gray-500 line-through text-lg">₹${price.toLocaleString()}</span>
          <span class="text-green-600 font-medium text-sm">(${discountPercent}% OFF)</span>
        `;
      } else {
        html = `<span class="text-2xl sm:text-3xl font-semibold text-gray-900">₹${price.toLocaleString()}</span>`;
      }

      priceSection.innerHTML = html;

      /* ---------- Stock Handling ---------- */
      if (stock > 0) {
        addToCartBtn.classList.remove("hidden");
        outOfStockBtn.classList.add("hidden");
      } else {
        addToCartBtn.classList.add("hidden");
        outOfStockBtn.classList.remove("hidden");
      }
    });
  }

  /* ------------------------------------------------------------
      IMAGE ZOOM
  ------------------------------------------------------------ */
  if (mainImage) {
    mainImage.addEventListener("mousemove", (e) => {
      const { left, top, width, height } = mainImage.getBoundingClientRect();
      const x = ((e.pageX - left) / width) * 100;
      const y = ((e.pageY - top) / height) * 100;
      mainImage.style.transformOrigin = `${x}% ${y}%`;
      mainImage.style.transform = "scale(2)";
    });

    mainImage.addEventListener("mouseleave", () => {
      mainImage.style.transformOrigin = "center center";
      mainImage.style.transform = "scale(1)";
    });
  }

  /* ------------------------------------------------------------
      ADD TO CART
  ------------------------------------------------------------ */
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const productId = addToCartBtn.dataset.product;
      const variantId = addToCartBtn.dataset.variant;

      if (!variantId) {
        return Swal.fire({
          icon: "warning",
          title: "Please select a variant first",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      try {
        const res = await axios.post(
          "/cart/add",
          { productId, variantId },
          { headers: { "X-Requested-With": "XMLHttpRequest" } }
        );

        Swal.fire({
          icon: res.data.success ? "success" : "error",
          title: res.data.success ? "Added to Cart!" : "Failed",
          text: res.data.message || "",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });

        updateCounts();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: err.response?.data?.message || "Something went wrong",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });

        if (err.response?.status === 401) {
          setTimeout(() => (window.location.href = "/login"), 1500);
        }
      }
    });
  }

  /* ------------------------------------------------------------
      WISHLIST
  ------------------------------------------------------------ */
  if (wishlistBtn) {
    wishlistBtn.addEventListener("click", async () => {
      const productId = wishlistBtn.dataset.product;
      const variantId = variantSelect
        ? variantSelect.value
        : wishlistBtn.dataset.variant;

      try {
        const res = await axios.post("/wishlist/add", { productId, variantId });

        if (res.data.success && res.data.alreadyExists) {
          showToast("Already in wishlist", "warning");
        } else if (res.data.success) {
          heartIcon.classList.add("text-red-600");
          showToast("Added to wishlist", "success");
          updateCounts();
        }
      } catch (err) {
        showToast(
          err.response?.data?.message || "Error adding to wishlist",
          "error"
        );

        if (err.response?.status === 401) {
          setTimeout(() => (window.location.href = "/login"), 1500);
        }
      }
    });
  }

  /* ------------------------------------------------------------
      TOAST FUNCTION
  ------------------------------------------------------------ */
  function showToast(message, type = "success") {
    Swal.fire({
      icon: type,
      title: message,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
    });
  }
});

/* ------------------------------------------------------------
    UPDATE WISHLIST & CART ICON COUNTS (GLOBAL)
------------------------------------------------------------ */
async function updateCounts() {
  try {
    const response = await fetch("/get-counts");
    const data = await response.json();

    const wishlistBadge = document.getElementById("wishlistCount");
    const cartBadge = document.getElementById("cartCount");

    wishlistBadge.textContent = data.wishlistCount;
    cartBadge.textContent = data.cartCount;

    wishlistBadge.classList.toggle("hidden", data.wishlistCount === 0);
    cartBadge.classList.toggle("hidden", data.cartCount === 0);
  } catch (error) {
    console.error("Failed to update counts:", error);
  }
}
