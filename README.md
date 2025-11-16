# Jihang Li - Personal Portfolio Website

A modern, responsive personal portfolio website showcasing projects, resume, and interests. Built with HTML, CSS, and JavaScript with smooth animations and dark mode support.

## Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Mode**: Toggle between light and dark themes with persistent preference
- **Smooth Animations**: Scroll-based animations and hover effects
- **Interactive Navigation**: Sticky navbar with active link highlighting
- **Project Showcase**: Featured projects with links and descriptions
- **Resume Section**: Downloadable resume with education and research experience
- **Contact Methods**: Easy ways to get in touch

## File Structure

```
My-website/
├── index.html          # Main HTML file with all sections
├── styles.css          # Complete styling with dark mode support
├── script.js           # Interactive features and animations
├── Jihang_resume_2025.pdf  # Resume PDF for download
└── README.md          # This file
```

## Quick Start

1. **Open the website**: Simply open `index.html` in your web browser
   - Double-click `index.html`, or
   - Right-click and select "Open with" → your preferred browser

2. **View locally**: For best results, use a local server:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Python 2
   python -m SimpleHTTPServer 8000

   # Using Node.js (if you have http-server installed)
   npx http-server
   ```
   Then navigate to `http://localhost:8000` in your browser.

## Customization Guide

### Updating Personal Information

#### 1. Hero Section
In [index.html](index.html) around lines 35-60, update:
- Name in `<h1>` tag
- Title/role in hero subtitle
- Description text
- Social media links (GitHub, LinkedIn, Email)

#### 2. About Section
In [index.html](index.html) around lines 77-120, modify:
- Personal bio paragraphs
- Skills in each category (Languages, ML/AI, Frameworks & Tools)

#### 3. Projects
In [index.html](index.html) around lines 125-230, for each project update:
- Project icon (FontAwesome class)
- Project name
- Role/position
- Description
- Tags/technologies
- GitHub or demo links

Add new projects by copying a `.project-card` div and modifying the content.

#### 4. Resume
In [index.html](index.html) around lines 237-295, update:
- Education details
- Research experience
- Work experience (add new `.resume-item` divs as needed)
- Make sure your resume PDF is in the same folder

#### 5. Interests
In [index.html](index.html) around lines 302-345, customize:
- Interest icons
- Interest titles
- Descriptions

### Changing Colors

In [styles.css](styles.css) lines 1-15, modify the CSS variables:

```css
:root {
    --primary-color: #6366f1;      /* Main brand color */
    --secondary-color: #8b5cf6;    /* Secondary accent */
    --accent-color: #ec4899;       /* Additional accent */
    /* ... other colors ... */
}
```

### Adding Your Photo

Replace the placeholder in [index.html](index.html) around line 59:

```html
<!-- Replace this: -->
<div class="image-placeholder">
    <i class="fas fa-user-circle"></i>
</div>

<!-- With this: -->
<img src="your-photo.jpg" alt="Jihang Li" style="width: 350px; height: 350px; border-radius: 50%; object-fit: cover; box-shadow: var(--shadow-xl);">
```

### Modifying Animations

In [script.js](script.js):
- **Typing effect**: Lines 86-101 (adjust speed in `setTimeout`)
- **Scroll animations**: Lines 64-84 (adjust thresholds and transitions)
- **Card tilt**: Lines 103-121 (adjust rotation sensitivity)
- **Particles**: Lines 124-145 (uncomment line 148 to enable)

## Interactive Features

1. **Mobile Menu**: Hamburger menu for small screens
2. **Dark Mode Toggle**: Click the moon/sun icon in the navbar
3. **Smooth Scrolling**: Navigation links smoothly scroll to sections
4. **Active Link Highlighting**: Current section highlighted in navbar
5. **Scroll to Top**: Button appears when scrolling down
6. **Hover Effects**: Cards tilt and scale on hover
7. **Scroll Animations**: Elements fade in when scrolling

## Dependencies

The website uses CDN-hosted libraries (no installation required):
- **Font Awesome 6.4.0**: For icons
- **Google Fonts**: System fonts with fallbacks

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Deployment Options

### GitHub Pages
1. Create a repository named `username.github.io` or use project pages
2. Push your files to the main branch
3. Enable GitHub Pages in repository settings
4. Access at `https://username.github.io` or `https://username.github.io/repository-name`

### Netlify
1. Drag and drop the folder to [Netlify Drop](https://app.netlify.com/drop)
2. Get instant deployment with custom domain support

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts

## Performance Tips

- The website is optimized for fast loading
- Images should be compressed (use tools like TinyPNG)
- Consider lazy loading for images if you add many
- Dark mode preference is saved in localStorage

## Troubleshooting

**Icons not showing?**
- Check your internet connection (Font Awesome loads from CDN)
- Verify the CDN link in `<head>` section

**Animations not working?**
- Make sure `script.js` is properly linked
- Check browser console for errors (F12)

**Dark mode not persisting?**
- Check if localStorage is enabled in your browser
- Try clearing browser cache

## Future Enhancements

Consider adding:
- Blog section with articles
- More projects as you build them
- Testimonials/recommendations
- Skills with proficiency levels
- Contact form with backend
- Analytics (Google Analytics, Plausible)
- More interactive animations

## License

Feel free to use this template for your own portfolio! Just remember to:
- Update all personal information
- Replace projects with your own
- Customize colors and styling to match your brand

## Contact

For questions or suggestions about this website:
- Email: lijihang21@gmail.com
- GitHub: [@JihangLi1121](https://github.com/JihangLi1121)
- LinkedIn: [Jihang Li](https://www.linkedin.com/in/jihang-li21/)

---

Built with passion and lots of coffee by Jihang Li
