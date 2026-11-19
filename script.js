/* ==========================================
   MINA'S SAVEUR - SCRIPT
   1. Config   2. Helpers   3. State
   4. Filters  5. Quantity & Add   6. Cart
   7. Order form (WhatsApp)   8. Init
========================================== */

(() => {
    'use strict';

    /* ================= 1. CONFIG ================= */

    // رقم الواتساب بالصيغة الدولية بدون + (مثال الجزائر: 213 + الرقم بدون الصفر)
    const WHATSAPP_NUMBER = '213555075000';
    const CURRENCY = 'دج';
    const STORAGE_KEY = 'mina-saveur-cart';
    const MAX_QTY = 99;

    /* ================= 2. HELPERS ================= */

    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    const money = (n) => `${n.toLocaleString('en-US')} ${CURRENCY}`;
    const clamp = (n) => Math.min(MAX_QTY, Math.max(1, n));

    /* ================= 3. STATE ================= */

    // cart: Map<id, { id, name, price, qty }>
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
        } catch { /* التخزين غير متاح */ }
    };

    const cartTotal = () =>
        [...cart.values()].reduce((sum, item) => sum + item.price * item.qty, 0);

    /* ================= 4. FILTERS ================= */

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

    /* ================= 5. QUANTITY & ADD ================= */

    cards.forEach((card) => {
        const qEl = $('.q', card);
        const addBtn = $('.add-btn', card);
        let addLabel = addBtn.textContent;
        let resetTimer;

        const setQty = (n) => { qEl.textContent = clamp(n); };

        $('.plus', card).addEventListener('click', () => setQty(+qEl.textContent + 1));
        $('.minus', card).addEventListener('click', () => setQty(+qEl.textContent - 1));

        addBtn.addEventListener('click', () => {
            const id = card.dataset.id;
            const qty = +qEl.textContent;
            const existing = cart.get(id);

            if (existing) {
                existing.qty = clamp(existing.qty + qty);
            } else {
                cart.set(id, {
                    id,
                    name: $('h3', card).textContent.trim(),
                    price: +$('.price', card).textContent,
                    qty,
                });
            }

            setQty(1);
            renderCart();

            // تأكيد بصري قصير
            clearTimeout(resetTimer);
            addBtn.textContent = 'تمت الإضافة ✓';
            resetTimer = setTimeout(() => { addBtn.textContent = addLabel; }, 1200);
        });
    });

    /* ================= 6. CART ================= */

    const cartList = $('#cart-list');
    const totalEl = $('#total');

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
        minus.setAttribute('aria-label', 'إنقاص الكمية');
        minus.textContent = '-';

        const qty = document.createElement('span');
        qty.textContent = item.qty;

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.dataset.action = 'plus';
        plus.setAttribute('aria-label', 'زيادة الكمية');
        plus.textContent = '+';

        controls.append(minus, qty, plus);

        const sum = document.createElement('span');
        sum.className = 'cart-sum';
        sum.textContent = money(item.price * item.qty);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cart-remove';
        remove.dataset.action = 'remove';
        remove.setAttribute('aria-label', 'حذف المنتج');
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
        saveCart();
    }

    // أزرار السلة (+ / - / حذف)
    cartList.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const id = btn.closest('.cart-item').dataset.id;
        const item = cart.get(id);
        if (!item) return;

        const { action } = btn.dataset;
        if (action === 'plus')   item.qty = clamp(item.qty + 1);
        if (action === 'minus')  item.qty = item.qty - 1;
        if (action === 'remove' || item.qty < 1) cart.delete(id);

        renderCart();
    });

    /* ================= 7. ORDER FORM (WHATSAPP) ================= */

    const form = $('#order-form');
    const msg = $('#form-msg');

    const showMsg = (text, type) => {
        msg.textContent = text;
        msg.className = `form-msg ${type}`;
    };

    const buildWhatsAppText = (data) => {
        const lines = [
            "🛒 *طلب جديد - Mina's Saveur*",
            '',
            ...[...cart.values()].map(
                (i) => `• ${i.name} × ${i.qty} = ${money(i.price * i.qty)}`
            ),
            '',
            `*المجموع:* ${money(cartTotal())}`,
            '',
            `👤 الاسم: ${data.customer}`,
            `📞 الهاتف: ${data.phone}`,
            `📍 العنوان: ${data.address}`,
        ];
        if (data.notes) lines.push(`📝 ملاحظات: ${data.notes}`);
        return lines.join('\n');
    };

    form.addEventListener('submit', (e) => {
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

        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppText(data))}`;
        window.open(url, '_blank', 'noopener');

        showMsg('تم تحضير طلبك، أكملي الإرسال من WhatsApp ✓', 'ok');
    });

    /* ================= 8. INIT ================= */

    loadCart();
    renderCart();
    applyFilter('all');
})();