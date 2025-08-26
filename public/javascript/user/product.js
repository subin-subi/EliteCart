
        document.addEventListener('DOMContentLoaded', () => {
            const categorySelect = document.getElementById('category');
            const brandSelect = document.getElementById('brand');
            const minPriceInput = document.getElementById('minPrice');
            const maxPriceInput = document.getElementById('maxPrice');
            const stockFilter = document.getElementById('stockFilter');
            const filterButton = document.getElementById('filterButton');
            const resetButton = document.getElementById('resetButton');
            const searchInput = document.getElementById('searchInput');
            const searchButton = document.getElementById('searchButton');
            const clearSearchButton = document.getElementById('clearSearchButton');

            function buildParams() {
                const params = new URLSearchParams();
                if (categorySelect && categorySelect.value) params.set('category', categorySelect.value);
                if (brandSelect && brandSelect.value) params.set('brand', brandSelect.value);
                if (minPriceInput && minPriceInput.value) params.set('minPrice', minPriceInput.value);
                if (maxPriceInput && maxPriceInput.value) params.set('maxPrice', maxPriceInput.value);
                if (stockFilter && stockFilter.value) params.set('stock', stockFilter.value);
                if (searchInput && searchInput.value.trim()) params.set('search', searchInput.value.trim());
                return params.toString();
            }

            function applyFilters() {
                const query = buildParams();
                const url = query ? `/product?${query}` : '/product';
                window.location.href = url;
            }

            function debounce(fn, wait) {
                let t;
                return function() {
                    clearTimeout(t);
                    const args = arguments;
                    const ctx = this;
                    t = setTimeout(() => fn.apply(ctx, args), wait);
                };
            }

            if (categorySelect) categorySelect.addEventListener('change', applyFilters);
            if (brandSelect) brandSelect.addEventListener('change', applyFilters);
            if (stockFilter) stockFilter.addEventListener('change', applyFilters);
            if (minPriceInput) minPriceInput.addEventListener('input', debounce(applyFilters, 400));
            if (maxPriceInput) maxPriceInput.addEventListener('input', debounce(applyFilters, 400));
            if (filterButton) filterButton.addEventListener('click', applyFilters);
            if (resetButton) resetButton.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/product';
            });

            // Search interactions
            if (searchInput && clearSearchButton) {
                searchInput.addEventListener('input', () => {
                    clearSearchButton.classList.toggle('hidden', !searchInput.value.trim());
                });
                clearSearchButton.addEventListener('click', () => {
                    searchInput.value = '';
                    clearSearchButton.classList.add('hidden');
                    applyFilters();
                });
            }
            if (searchButton) {
                searchButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    applyFilters();
                });
            }
            if (searchInput) {
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        applyFilters();
                    }
                });
            }
        });
