// ===== Mobile Menu Toggle =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a nav link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ===== Dark Mode Toggle =====
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const themeIcon = themeToggle.querySelector('i');

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');

    // Update icon
    if (body.classList.contains('dark-mode')) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }

    // Update background effect (sun/stars)
    if (typeof updateBackgroundEffect === 'function') {
        updateBackgroundEffect();
    }
});

// ===== Navbar Scroll Effect =====
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ===== Active Nav Link on Scroll =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveLink() {
    const scrollPosition = window.pageYOffset + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', updateActiveLink);

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));

        if (target) {
            const offsetTop = target.offsetTop - 80; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Scroll Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Add fade-in animation to elements
const animateOnScroll = document.querySelectorAll('.project-card, .interest-card, .skill-category, .resume-section, .contact-card, .hobby-card, .music-card');

animateOnScroll.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(element);
});

// ===== Fade-in Effect for Hero Title =====
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
    heroTitle.style.opacity = '0';
    heroTitle.style.transform = 'translateY(20px)';
    heroTitle.style.transition = 'opacity 0.8s ease, transform 0.8s ease';

    setTimeout(() => {
        heroTitle.style.opacity = '1';
        heroTitle.style.transform = 'translateY(0)';
    }, 300);
}

// ===== Project Card Tilt Effect (Optional Enhancement) =====
const projectCards = document.querySelectorAll('.project-card');

projectCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// ===== Dynamic Background Effect (Sun/Stars) =====
function clearBackgroundEffects() {
    const hero = document.querySelector('.hero');
    const particles = hero.querySelectorAll('.sun-ray, .star');
    particles.forEach(p => p.remove());
}

function createSunEffect() {
    const hero = document.querySelector('.hero');

    // Create P3R-style sharp geometric shapes
    for (let i = 0; i < 8; i++) {
        const shape = document.createElement('div');
        shape.className = 'sun-ray';
        const size = Math.random() * 100 + 50;
        shape.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(0, 212, 255, 0.05);
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            opacity: 1;
            animation: float-shape ${Math.random() * 20 + 10}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
            pointer-events: none;
            clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
            border: 2px solid rgba(0, 212, 255, 0.1);
        `;
        hero.appendChild(shape);
    }

    // Create sharp line accents
    for (let i = 0; i < 5; i++) {
        const line = document.createElement('div');
        line.className = 'sun-ray';
        line.style.cssText = `
            position: absolute;
            width: ${Math.random() * 200 + 100}px;
            height: 2px;
            background: rgba(0, 212, 255, 0.2);
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            opacity: 1;
            animation: slide-line ${Math.random() * 15 + 10}s ease-in-out infinite;
            animation-delay: ${Math.random() * 3}s;
            pointer-events: none;
            transform: rotate(${Math.random() * 45}deg);
        `;
        hero.appendChild(line);
    }
}

@keyframes float-shape {
    0%, 100% {
        transform: translateY(0) rotate(0deg);
    }
    50% {
        transform: translateY(-30px) rotate(180deg);
    }
}

@keyframes slide-line {
    0%, 100% {
        transform: translateX(0);
        opacity: 0.2;
    }
    50% {
        transform: translateX(50px);
        opacity: 0.5;
    }
}

function createStarsEffect() {
    const hero = document.querySelector('.hero');

    // Create twinkling stars
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 3 + 1;
        star.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: white;
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.8 + 0.2};
            animation: twinkle ${Math.random() * 3 + 2}s ease-in-out infinite;
            animation-delay: ${Math.random() * 3}s;
            pointer-events: none;
            box-shadow: 0 0 ${size * 2}px rgba(255, 255, 255, 0.5);
        `;
        hero.appendChild(star);
    }

    // Create more shooting stars with varied animations
    for (let i = 0; i < 8; i++) {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'star';
        const duration = 6 + Math.random() * 6;
        const delay = Math.random() * 15;
        shootingStar.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: white;
            border-radius: 50%;
            top: ${Math.random() * 40}%;
            left: ${Math.random() * 80}%;
            opacity: 0;
            animation: shooting-star-${i % 3} ${duration}s linear infinite;
            animation-delay: ${delay}s;
            pointer-events: none;
        `;
        hero.appendChild(shootingStar);
    }
}

function updateBackgroundEffect() {
    clearBackgroundEffects();
    if (document.body.classList.contains('dark-mode')) {
        createStarsEffect();
    } else {
        createSunEffect();
    }
}

// Initialize background effect
updateBackgroundEffect();

// ===== Copy Email to Clipboard =====
const emailLinks = document.querySelectorAll('a[href^="mailto:"]');

emailLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const email = link.getAttribute('href').replace('mailto:', '');

        if (navigator.clipboard) {
            // Show a temporary tooltip
            const originalText = link.innerHTML;
            navigator.clipboard.writeText(email).then(() => {
                // Optional: Add a copy confirmation
                console.log('Email copied to clipboard!');
            });
        }
    });
});

// ===== Skills Progress Animation =====
function animateSkillBars() {
    const skillTags = document.querySelectorAll('.skill-tag');

    skillTags.forEach((tag, index) => {
        setTimeout(() => {
            tag.style.opacity = '0';
            tag.style.transform = 'scale(0.8)';
            tag.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

            setTimeout(() => {
                tag.style.opacity = '1';
                tag.style.transform = 'scale(1)';
            }, 50);
        }, index * 50);
    });
}

// Trigger skill animation when skills section is visible
const skillsSection = document.querySelector('.about');
if (skillsSection) {
    const skillsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateSkillBars();
                skillsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    skillsObserver.observe(skillsSection);
}

// ===== Scroll to Top Button (Optional) =====
const scrollTopBtn = document.createElement('button');
scrollTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollTopBtn.className = 'scroll-to-top';
scrollTopBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 999;
    font-size: 1.2rem;
`;

document.body.appendChild(scrollTopBtn);

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollTopBtn.style.opacity = '1';
        scrollTopBtn.style.visibility = 'visible';
    } else {
        scrollTopBtn.style.opacity = '0';
        scrollTopBtn.style.visibility = 'hidden';
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

scrollTopBtn.addEventListener('mouseenter', () => {
    scrollTopBtn.style.transform = 'translateY(-5px)';
});

scrollTopBtn.addEventListener('mouseleave', () => {
    scrollTopBtn.style.transform = 'translateY(0)';
});

// ===== Console Easter Egg =====
console.log('%c👋 Hello there!', 'font-size: 20px; font-weight: bold; color: #6366f1;');
console.log('%cLooking at the code? I like your style!', 'font-size: 14px; color: #8b5cf6;');
console.log('%cFeel free to reach out: lijihang21@gmail.com', 'font-size: 12px; color: #666;');

// ===== Performance Optimization: Debounce Scroll Events =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounce to scroll-heavy functions if needed
const debouncedScrollHandler = debounce(() => {
    updateActiveLink();
}, 10);

window.addEventListener('scroll', debouncedScrollHandler);

// ===== Initialize everything when DOM is fully loaded =====
document.addEventListener('DOMContentLoaded', () => {
    // Add entrance animation to hero section
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.opacity = '0';
        setTimeout(() => {
            hero.style.transition = 'opacity 0.6s ease';
            hero.style.opacity = '1';
        }, 100);
    }

    // Add stagger animation to project cards
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
});
