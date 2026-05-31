# Gender Wage Gap — Scrollytelling

An interactive web experience that illustrates the gender pay gap through narrative intro slides, a salary comparison form, optional camera-based face analysis, and a scroll-driven results story.

**Live demos:**
- [Netlify](https://genderiquality.netlify.app/) — root domain (`/`)
- [GitHub Pages](https://shamsabdulwhab.github.io/Scrollytelling/) — subpath (`/Scrollytelling/`)

---

## Overview

This project is a single-page React application designed for education and awareness. Users move through three stages:

| Stage | Route | Description |
| --- | --- | --- |
| **Intro** | `/` | Two full-screen slides introducing the gender wage gap (e.g. €1 vs €0.87). |
| **Form** | `/form` | Collect company name, gender, expected salary, field of study, and an optional profile photo. |
| **Result** | `/result` | Visualize the adjusted salary gap and scroll through personalized action suggestions. |

The salary comparison uses simplified demo multipliers by gender. Camera insights combine on-device face detection with optional neural age/gender estimates. **These outputs are illustrative only and are not used for identity verification or hiring decisions.**

---

## Features

- **Guided intro flow** — Tap or keyboard navigation through title and statistics slides.
- **Salary gap calculator** — Compare expected vs. adjusted salary with pyramid visualization.
- **Camera capture** — BlazeFace face detection with quality checks (lighting, framing, face count).
- **On-device ML** — Age and binary gender estimates via [face-api](https://github.com/vladmandic/face-api) (runs entirely in the browser).
- **Scroll-driven results** — Story cards with negotiation and workplace equity suggestions tailored to gender and field of study.
- **Accessible UI** — Keyboard support, ARIA labels, and clear form validation.

---

## Tech stack

| Layer | Technologies |
| --- | --- |
| **UI** | React 19, TypeScript, CSS |
| **Build** | Vite 8 |
| **Routing** | React Router 7 |
| **Face detection** | TensorFlow.js, BlazeFace |
| **Age / gender model** | `@vladmandic/face-api` |
| **Deployment** | Netlify, GitHub Pages (`gh-pages`) |

All inference runs client-side. No photos or form data are sent to a backend.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later  
- npm (included with Node.js)

### Install

```bash
git clone https://github.com/shamsabdulwhab/Scrollytelling.git
cd Scrollytelling
npm install
```

### Development

```bash
npm run dev
```

Open the URL shown in the terminal. Local dev uses the GitHub Pages base path by default:

```
http://localhost:5173/Scrollytelling/
```

To preview the Netlify layout locally:

```bash
$env:VITE_BASE="/"; npm run build; npm run preview
```

Then open `http://localhost:4173/`.

### Production build

```bash
npm run build
npm run preview
```

Preview serves the production build locally (again under `/Scrollytelling/`).

### Lint

```bash
npm run lint
```

### Deploy to Netlify

Push to a connected Git branch. `netlify.toml` sets `VITE_BASE=/` so assets load from the site root (required for [genderiquality.netlify.app](https://genderiquality.netlify.app/)).

Build command: `npm run build` · Publish directory: `dist`

### Deploy to GitHub Pages

```bash
npm run deploy
```

This builds the app, copies `index.html` to `404.html` for SPA routing, and publishes the `dist/` folder to the `gh-pages` branch.

---

## Project structure

```
src/
├── app/              # Global flow state (form, result, navigation)
├── components/       # Reusable UI (camera, back button)
├── layouts/          # App shell and scene routing
├── pages/            # Intro, form, and result scenes
├── utils/            # Salary math, face API, path helpers
├── constants.ts      # Salary bounds and labels
└── types.ts          # Shared TypeScript types

public/
└── models/face-api/  # Pre-trained model weights (bundled at build time)
```

---

## Configuration

| Setting | Location | Notes |
| --- | --- | --- |
| **Base URL** | `vite.config.ts` → `base` | Default `/Scrollytelling/` (GitHub Pages). Netlify sets `VITE_BASE=/` in `netlify.toml`. |
| **Router basename** | `src/main.tsx` | Derived from `import.meta.env.BASE_URL` — keep in sync with Vite `base`. |
| **Salary range** | `src/constants.ts` | `MIN_SALARY`, `MAX_SALARY`, `DEFAULT_SALARY` |
| **Gap multipliers** | `src/utils/salaryResult.ts` | Demo-only adjustment factors |

---

## Important notes

- **Educational demo** — Salary figures and gap percentages are simplified for storytelling, not statistical reporting.
- **Camera labels** — Ethnicity shown in the UI is a deterministic demo label. Age and gender (model) come from a neural network and can be wrong; the **Gender** dropdown is the value used for salary comparison.
- **Privacy** — Processing happens in the browser. Nothing is uploaded to a server by this app.
- **Browser support** — Camera and WebGL/TensorFlow features require a modern browser with `getUserMedia` support.

---

## Scripts reference

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Build and publish to GitHub Pages |

---

## Repository

- **GitHub:** [shamsabdulwhab/Scrollytelling](https://github.com/shamsabdulwhab/Scrollytelling)

---

## License

This project is provided as-is for educational purposes. Add a license file if you intend to open-source or redistribute the code.
