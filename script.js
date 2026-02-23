const navLinks = document.querySelectorAll('.site-nav ul a[href^="#"]');
const form = document.getElementById('inquiry-form');
const formStatus = document.getElementById('form-status');
const currentYear = document.getElementById('current-year');
const submitButton = document.getElementById('submit-button');
const submitButtonLabel = 'Send Quote Request';
const menuToggle = document.querySelector('.menu-toggle');
const navList = document.getElementById('primary-nav-list');

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

function trackEvent(eventName, payload = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const revealTargets = document.querySelectorAll('main section');
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealTargets.forEach((section) => {
    section.classList.add('reveal');
    revealObserver.observe(section);
  });
}

function setMenuState(isOpen) {
  if (!menuToggle || !navList) return;
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  navList.classList.toggle('open', isOpen);
}

if (menuToggle && navList) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    setMenuState(!isOpen);
    trackEvent('mobile_menu_toggle', { open: !isOpen });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenuState(false);
    }
  });
}

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href').slice(1);
    const targetSection = document.getElementById(targetId);
    if (window.matchMedia('(max-width: 760px)').matches) {
      setMenuState(false);
    }

    if (targetSection) {
      targetSection.setAttribute('tabindex', '-1');
      requestAnimationFrame(() => {
        targetSection.focus({ preventScroll: true });
      });
      trackEvent('nav_click', { target: targetId });
    }
  });
});

document.querySelectorAll('[data-track]').forEach((element) => {
  element.addEventListener('click', () => {
    trackEvent('cta_click', {
      label: element.getAttribute('data-track')
    });
  });
});

function setFieldError(field, message = '') {
  const errorNode = document.getElementById(`${field.id}-error`);
  if (errorNode) {
    errorNode.textContent = message;
  }
}

function setFieldValidity(field, isValid, message = '') {
  field.setAttribute('aria-invalid', isValid ? 'false' : 'true');
  setFieldError(field, isValid ? '' : message);
}

function validateForm() {
  if (!form) return false;

  const requiredFields = form.querySelectorAll('[required]');
  let isValid = true;

  requiredFields.forEach((field) => {
    const value = field.value.trim();
    const minLength = field.id === 'message' ? 15 : 1;
    let fieldValid = value.length >= minLength;
    let message = 'This field is required.';

    if (field.type === 'email') {
      fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      message = fieldValid ? '' : 'Please enter a valid business email address.';
    }

    if (field.id === 'message' && value.length < 15) {
      fieldValid = false;
      message = 'Please provide at least 15 characters for your requirements.';
    }

    setFieldValidity(field, fieldValid, message);
    if (!fieldValid) {
      isValid = false;
    }
  });

  return isValid;
}

function buildMailtoUrl(data) {
  const subject = `B2B Inquiry - ${data.productInterest}`;
  const bodyLines = [
    `Full Name: ${data.name}`,
    `Company: ${data.company}`,
    `Business Email: ${data.email}`,
    `Product Interest: ${data.productInterest}`,
    '',
    'Requirement Details:',
    data.message
  ];

  return `mailto:exports@goldeneverestmm.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
}

function setSubmittingState(isSubmitting) {
  if (!submitButton) return;

  submitButton.disabled = isSubmitting;
  submitButton.setAttribute('aria-busy', String(isSubmitting));
  submitButton.textContent = isSubmitting ? 'Sending…' : submitButtonLabel;
}

async function submitInquiry(formData) {
  if (!form) {
    throw new Error('Form not available');
  }

  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    throw new Error('No endpoint configured');
  }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return true;
  } finally {
    clearTimeout(timeoutId);
  }
}

if (form && formStatus) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const honeypot = form.website?.value.trim();
    if (honeypot) {
      trackEvent('form_spam_blocked');
      return;
    }

    if (!validateForm()) {
      formStatus.textContent = 'Please complete all required fields with valid information.';
      formStatus.className = 'form-status error';
      trackEvent('form_validation_error');
      return;
    }

    const formData = {
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      email: form.email.value.trim(),
      productInterest: form.productInterest.value.trim(),
      message: form.message.value.trim()
    };

    trackEvent('form_submit_attempt', { product_interest: formData.productInterest });
    setSubmittingState(true);

    submitInquiry(formData)
      .then(() => {
        formStatus.textContent = 'Thank you. Your inquiry has been submitted successfully. Our team will contact you within 1 business day.';
        formStatus.className = 'form-status success';
        trackEvent('form_submit_success', { delivery: 'api' });
        form.reset();
      })
      .catch(() => {
        formStatus.textContent = 'We could not submit automatically. Your email client will open with your inquiry details as a fallback.';
        formStatus.className = 'form-status error';
        trackEvent('form_submit_fallback', { delivery: 'mailto' });
        window.location.href = buildMailtoUrl(formData);
      })
      .finally(() => {
        setSubmittingState(false);
      });
  });

  form.querySelectorAll('[required]').forEach((field) => {
    field.addEventListener('blur', () => {
      const value = field.value.trim();
      if (!value) {
        setFieldValidity(field, false, 'This field is required.');
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setFieldValidity(field, false, 'Please enter a valid business email address.');
      } else {
        setFieldValidity(field, true, '');
      }
    });
  });
}
