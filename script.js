// Smooth Scrolling for Navigation Links
const navLinks = document.querySelectorAll('nav ul li a');

navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const targetSection = document.getElementById(this.getAttribute('href').slice(1));
    targetSection.scrollIntoView({
      behavior: 'smooth'
    });
  });
});
