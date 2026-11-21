(() => {
    'use strict';

    /* ================= 1. CONFIG ================= */
    // ضعي هنا إيميل صاحبة المتجر الذي ستصل إليه الطلبات
    const OWNER_EMAIL = 'minas.saveur@gmail.com';
    const EMAIL_ENDPOINT = `https://formsubmit.co/ajax/${OWNER_EMAIL}`;

    const CURRENCY = 'دج';
    const STORAGE_KEY = 'mina-saveur-cart';
    const MAX_QTY = 99;

    /* ================= 2. HELPERS ================= */
    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const money = (n) => `${n.toLocaleString('en-US')} ${CURRENCY}`;
    const clamp = (n) => Math.min(MAX_QTY, Math.max(1, n));

    /* ================= 3. STATE ================= */
    let cart = new Map();

    const loadCart = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            cart = new Map(saved.map((item) => [item.id, item]));
        } catch {
            cart = new Map();
        }
    };

    const saveCart = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...cart.values()]));
        } catch {}
    };

    const cartTotal = () =>
        [...cart.values()].reduce((sum, item) => sum + item.price * item.qty, 0);

    const totalItemsCount = () =>
        [...cart.values()].reduce((sum, item) => sum + item.qty, 0);

    /* ================= 4. SCROLL REVEAL ANIMATION ================= */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    $$('.reveal').forEach((el) => observer.observe(el));

    /* ================= 5. FILTERS ================= */
    const filterButtons = $$('.filter');
    const cards = $$('.card');

    const applyFilter = (value) => {
        filterButtons.forEach((btn) =>
            btn.classList.toggle('active', btn.dataset.filter === value)
        );
        cards.forEach((card) => {
            card.hidden = !(value === 'all' || card.dataset.cat === value);
        });
    };

    filterButtons.forEach((btn) =>
        btn.addEventListener('click', () => applyFilter(btn.dataset.filter))
    );

    /* ================= 6. ADD TO CART LOGIC ================= */
    const addToCart = (product, qty = 1) => {
        const existing = cart.get(product.id);
        if (existing) {
            existing.qty = clamp(existing.qty + qty);
        } else {
            cart.set(product.id, { ...product, qty });
        }
        renderCart();
    };

    cards.forEach((card) => {
        const qEl = $('.q', card);
        const addBtn = $('.add-btn', card);
        const addLabel = addBtn.textContent;
        let resetTimer;

        const setQty = (n) => { qEl.textContent = clamp(n); };

        $('.plus', card).addEventListener('click', () => setQty(+qEl.textContent + 1));
        $('.minus', card).addEventListener('click', () => setQty(+qEl.textContent - 1));

        addBtn.addEventListener('click', () => {
            addToCart({
                id: card.dataset.id,
                name: $('h3', card).textContent.trim(),
                price: +$('.price', card).textContent,
            }, +qEl.textContent);

            setQty(1);
            clearTimeout(resetTimer);
            addBtn.textContent = 'تمت الإضافة ✓';
            resetTimer = setTimeout(() => { addBtn.textContent = addLabel; }, 1200);
        });
    });

    /* ================= 7. PRODUCT GALLERY MODAL ================= */
    const modal = $('#product-modal');
    const modalMainImg = $('#modal-main-img');
    const modalThumbs = $('#modal-thumbs');
    const modalTitle = $('#modal-title');
    const modalDesc = $('#modal-desc');
    const modalPrice = $('#modal-price');
    const modalAddBtn = $('#modal-add-btn');

    let currentImages = [];
    let currentIndex = 0;
    let activeProduct = null;

    const updateModalImage = (index) => {
        currentIndex = (index + currentImages.length) % currentImages.length;
        modalMainImg.style.opacity = '0.3';
        setTimeout(() => {
            modalMainImg.src = currentImages[currentIndex];
            modalMainImg.style.opacity = '1';
        }, 120);

        $$('img', modalThumbs).forEach((thumb, i) => {
            thumb.classList.toggle('active', i === currentIndex);
        });
    };

    const openModal = (card) => {
        const rawImages = card.dataset.images || $('img', card).getAttribute('src');
        currentImages = rawImages.split(',').map((s) => s.trim()).filter(Boolean);
        currentIndex = 0;

        activeProduct = {
            id: card.dataset.id,
            name: $('h3', card).textContent.trim(),
            price: +$('.price', card).textContent,
        };

        modalTitle.textContent = activeProduct.name;
        modalDesc.textContent = $('.desc', card).textContent.trim();
        modalPrice.textContent = money(activeProduct.price);

        modalThumbs.replaceChildren();
        if (currentImages.length > 1) {
            currentImages.forEach((src, idx) => {
                const img = document.createElement('img');
                img.src = src;
                img.alt = `${activeProduct.name} - صورة ${idx + 1}`;
                if (idx === 0) img.classList.add('active');
                img.addEventListener('click', () => updateModalImage(idx));
                modalThumbs.append(img);
            });
            modalThumbs.hidden = false;
            $('.slider-btn.prev', modal).hidden = false;
            $('.slider-btn.next', modal).hidden = false;
        } else {
            modalThumbs.hidden = true;
            $('.slider-btn.prev', modal).hidden = true;
            $('.slider-btn.next', modal).hidden = true;
        }

        modalMainImg.src = currentImages[0];
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    };

    cards.forEach((card) => {
        $('.card-img-wrap', card).addEventListener('click', () => openModal(card));
    });

    $('.slider-btn.prev', modal).addEventListener('click', () => updateModalImage(currentIndex - 1));
    $('.slider-btn.next', modal).addEventListener('click', () => updateModalImage(currentIndex + 1));
    $('.modal-close', modal).addEventListener('click', closeModal);
    $('.modal-backdrop', modal).addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('open')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowRight') updateModalImage(currentIndex - 1);
        if (e.key === 'ArrowLeft') updateModalImage(currentIndex + 1);
    });

    modalAddBtn.addEventListener('click', () => {
        if (!activeProduct) return;
        addToCart(activeProduct, 1);
        modalAddBtn.textContent = 'تمت الإضافة ✓';
        setTimeout(() => {
            modalAddBtn.textContent = 'أضف للسلة ➕';
            closeModal();
        }, 700);
    });

    /* ================= 8. CART RENDER ================= */
    const cartList = $('#cart-list');
    const totalEl = $('#total');
    const navCartCount = $('#nav-cart-count');

    const buildCartItem = (item) => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.dataset.id = item.id;

        const name = document.createElement('span');
        name.className = 'cart-name';
        name.textContent = item.name;

        const controls = document.createElement('span');
        controls.className = 'cart-qty';

        const minus = document.createElement('button');
        minus.type = 'button';
        minus.dataset.action = 'minus';
        minus.textContent = '-';

        const qty = document.createElement('span');
        qty.textContent = item.qty;

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.dataset.action = 'plus';
        plus.textContent = '+';

        controls.append(minus, qty, plus);

        const sum = document.createElement('span');
        sum.className = 'cart-sum';
        sum.textContent = money(item.price * item.qty);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cart-remove';
        remove.dataset.action = 'remove';
        remove.textContent = '✕';

        li.append(name, controls, sum, remove);
        return li;
    };

    function renderCart() {
        cartList.replaceChildren();

        if (cart.size === 0) {
            const empty = document.createElement('li');
            empty.textContent = 'السلة فارغة حاليا';
            cartList.append(empty);
        } else {
            cart.forEach((item) => cartList.append(buildCartItem(item)));
        }

        totalEl.textContent = money(cartTotal());
        if (navCartCount) navCartCount.textContent = totalItemsCount();
        saveCart();
    }

    cartList.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const id = btn.closest('.cart-item').dataset.id;
        const item = cart.get(id);
        if (!item) return;

        const { action } = btn.dataset;
        if (action === 'plus') item.qty = clamp(item.qty + 1);
        if (action === 'minus') item.qty = item.qty - 1;
        if (action === 'remove' || item.qty < 1) cart.delete(id);

        renderCart();
    });

    /* ================= 9. ORDER FORM (EMAIL BACKEND) ================= */
    const form = $('#order-form');
    const msg = $('#form-msg');
    const submitBtn = $('#submit-btn');

    const showMsg = (text, type) => {
        msg.textContent = text;
        msg.className = `form-msg ${type}`;
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (cart.size === 0) {
            showMsg('السلة فارغة، أضيفي منتجا واحدا على الأقل.', 'error');
            $('#products').scrollIntoView();
            return;
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = Object.fromEntries(
            [...new FormData(form)].map(([k, v]) => [k, v.trim()])
        );

        const orderDetails = [...cart.values()]
            .map((i) => `${i.name} (الكمية: ${i.qty}) = ${money(i.price * i.qty)}`)
            .join('\n');

        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري إرسال الطلب... ⏳';

        try {
            const response = await fetch(EMAIL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    _subject: `طلب جديد من ${data.customer} - Mina's Saveur`,
                    الاسم_الكامل: data.customer,
                    رقم_الهاتف: data.phone,
                    العنوان: data.address,
                    ملاحظات: data.notes || 'لا توجد ملاحظات',
                    تفاصيل_الطلب: orderDetails,
                    المجموع_الكلي: money(cartTotal())
                })
            });

            if (response.ok) {
                showMsg('تم إرسال طلبك بنجاح! سنتواصل معك قريبا لتأكيد الطلب ✓', 'ok');
                cart.clear();
                renderCart();
                form.reset();
            } else {
                throw new Error('Server error');
            }
        } catch {
            showMsg('حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'تأكيد وإرسال الطلب 📩';
        }
    });

    /* ================= 10. INIT ================= */
    loadCart();
    renderCart();
    applyFilter('all');
})();