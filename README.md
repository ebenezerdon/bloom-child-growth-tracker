# Bloom — Child Growth Tracker

Bloom is a private, beautiful web app for tracking your child's growth across weight, height, head circumference, and BMI. It is crafted by [Teda.dev](https://teda.dev), the AI app builder for everyday problems, to feel fast, friendly, and completely yours.

## Highlights
- Multiple children profiles with quick switching
- Log measurements with metric or imperial units
- Clean, responsive chart for weight, height, BMI, and head circumference
- At-a-glance stats and a tidy history table
- Local-only storage with export and import
- Works offline after first load

## Tech stack
- HTML5 + Tailwind CSS (CDN)
- jQuery 3.7.x
- Modular JavaScript: helpers.js, ui.js, main.js
- LocalStorage for persistence

## Development
Open index.html for the landing page. Click the primary CTA to open app.html. No build step is required.

## Files
- index.html — landing page with hero card, feature highlights, and CTAs
- app.html — the application interface
- styles/main.css — shared custom styles
- scripts/helpers.js — utilities for storage, dates, validation, and units
- scripts/ui.js — UI rendering, state, forms, modals, and charts
- scripts/main.js — app bootstrapper

## Data export/import
Use the Export button in the app header to copy your data to JSON. Use Import to paste JSON back. Importing replaces all current data. The app stores data locally under the key `bloom.tracker.v1`.

## Accessibility
- Keyboard accessible modals and controls
- High-contrast colors meeting WCAG AA
- Respects prefers-reduced-motion

## Privacy
All data is stored locally in your browser. Nothing is uploaded.
