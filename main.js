/* ===== Termez sayti uchun JavaScript ===== */

// 1) Hero bo'limidagi oltin zarrachalar (particles)
const particleContainer = document.getElementById('particles');
if (particleContainer) {
  for (let i = 0; i < 30; i++) {
    const span = document.createElement('span');
    const size = 2 + Math.random() * 4;
    span.style.left = Math.random() * 100 + '%';
    span.style.top = Math.random() * 100 + '%';
    span.style.width = size + 'px';
    span.style.height = size + 'px';
    span.style.animationDelay = Math.random() * 6 + 's';
    span.style.animationDuration = 4 + Math.random() * 4 + 's';
    particleContainer.appendChild(span);
  }
}

// 2) Scroll bo'yicha elementlarni ochish (reveal animatsiya)
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

revealElements.forEach((el) => revealObserver.observe(el));

// 3) Navbar fonini scroll paytida o'zgartirish
const navbar = document.querySelector('nav');
window.addEventListener('scroll', () => {
  if (!navbar) return;
  navbar.style.background = window.scrollY > 50
    ? 'rgba(26, 18, 0, 0.97)'
    : 'rgba(26, 18, 0, 0.85)';
});

// 4) Raqamlarni noldan chiqarish (statistika bo'limi)
const statNumbers = document.querySelectorAll('.stat-number');
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const raw = el.dataset.value || el.textContent.trim();
    const suffixMatch = raw.match(/[^\d.,]+$/);
    const suffix = suffixMatch ? suffixMatch[0] : '';
    const target = parseFloat(raw.replace(/[^\d.]/g, '')) || 0;
    let current = 0;
    const step = Math.max(target / 60, 0.5);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.round(current) + suffix;
    }, 24);
    statObserver.unobserve(el);
  });
}, { threshold: 0.5 });

statNumbers.forEach((el) => statObserver.observe(el));

// 5) Aloqa formasi
const sendBtn = document.getElementById('sendBtn');
if (sendBtn) {
  sendBtn.addEventListener('click', function () {
    const fields = document.querySelectorAll('.contact-form input, .contact-form textarea');
    const allFilled = Array.from(fields).every((f) => f.value.trim() !== '');
    const originalText = 'Xabar Yuborish ';

    if (allFilled) {
      this.textContent = '✅ Yuborildi!';
      this.style.background = '#4caf50';
      fields.forEach((f) => { f.value = ''; });
    } else {
      this.textContent = '⚠️ Barcha maydonlarni to\'ldiring!';
      this.style.background = '#e53935';
    }

    setTimeout(() => {
      this.textContent = originalText;
      this.style.background = '';
    }, 2500);
  });
}

// 7) Rasmlar yuklanmasa - chiroyli gradient fon bilan almashtirish
document.querySelectorAll('img').forEach((img) => {
  img.setAttribute('loading', 'lazy');
  img.addEventListener('error', () => {
    img.style.background = 'linear-gradient(135deg, #3d1f00 0%, #c9a84c 100%)';
    img.removeAttribute('src');
  }, { once: true });
});

// 8) Galereya rasmini kattalashtirish (sodda lightbox)
const galleryOverlay = document.createElement('div');
galleryOverlay.className = 'lightbox';
galleryOverlay.innerHTML = '<img alt="Termez" />';
document.body.appendChild(galleryOverlay);

document.querySelectorAll('.gallery-item').forEach((item) => {
  item.addEventListener('click', () => {
    const source = item.querySelector('img');
    if (!source || !source.src) return;
    galleryOverlay.querySelector('img').src = source.src;
    galleryOverlay.classList.add('active');
  });
});

galleryOverlay.addEventListener('click', () => galleryOverlay.classList.remove('active'));

document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
  });
});