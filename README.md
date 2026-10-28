# VisionScope AI

**A computer-vision workspace for exploring object detection, model confidence, and annotated images.**

VisionScope AI combines a browser-based TensorFlow.js detector with an optional server-side Gemini vision pipeline. It provides a visual workspace for testing images, reviewing predictions, adjusting the confidence threshold, and exporting annotated results.

> **Privacy note:** When the Gemini API is configured, images submitted for AI detection are sent to this application's server and forwarded to Google's Gemini API. Without a configured Gemini API key, the app can use its local TensorFlow.js detector. Do not upload sensitive or confidential images unless you are comfortable with the applicable processing.

## Features

- **Image-based detection** — upload supported JPG, JPEG, PNG, or WebP images, or try the included sample presets.
- **Two detection paths** — local TensorFlow.js / COCO-SSD inference and optional server-side Gemini vision for more specific labels.
- **Local fallback** — the detector can fall back to local COCO-SSD inference when the vision API is unavailable or rate-limited.
- **Adjustable confidence threshold** — filter visible detections to explore the trade-off between more results and stricter confidence.
- **Detection overlays** — review detected objects and their bounding boxes on the image.
- **Annotated image export** — export a PNG with detection overlays.
- **Model options and diagnostics** — inspect raw predictions, model/backend information, image dimensions, inference timing, and threshold filtering; switch between the supported MobileNet-based model options where available.
- **Server-side safeguards** — the Express API includes request validation, payload limits, rate limiting, origin checks, and security headers.

Detection results are model predictions, not guarantees. Accuracy depends on image quality, object size, lighting, model limitations, and confidence settings.

## Technology stack

- React and TypeScript
- Vite
- TensorFlow.js and `@tensorflow-models/coco-ssd`
- Google Gen AI SDK (optional Gemini vision endpoint)
- Node.js and Express
- Tailwind CSS and Lucide icons

## Requirements

- Node.js **20 or newer**
- npm
- A Gemini API key only if you want to enable the server-side Gemini detection path

## Run locally

1. Clone the repository and enter the project directory:

   ```bash
   git clone <YOUR_GITHUB_REPOSITORY_URL>
   cd <YOUR_PROJECT_DIRECTORY>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local environment file by copying `.env.example` to `.env.local`.

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   On macOS or Linux:

   ```bash
   cp .env.example .env.local
   ```

4. To enable Gemini detection, edit `.env.local` and set your key:

   ```dotenv
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   Keep the key on the server. Never put it in client-side code or commit `.env.local`. If you do not configure a key, the app is designed to use its local detector.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open the local URL printed in the terminal.

## Production build

Build the client and bundle the Express server:

```bash
npm run build
npm start
```

The production server serves the built client and API. Configure `GEMINI_API_KEY` through your hosting provider's secret/environment-variable settings rather than committing it to the repository. See `.env.example` for available configuration options and `SECURITY-REVIEW.md` for the project's security notes.

Before deploying publicly, review your hosting provider's environment-variable instructions, configure appropriate Gemini API quotas and key restrictions, and test the deployed application. Rate limits are in-memory and apply per server process; they are not a substitute for authentication or provider-side quota controls.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Build the frontend and bundle the server. |
| `npm start` | Start the production server bundle. |
| `npm run lint` | Run the TypeScript compiler without emitting files. |
| `npm run preview` | Preview the Vite production build. |
| `npm run clean` | Remove generated build output. |

## Project structure

```text
.
├── public/
│   └── models/             # Local TensorFlow.js model assets
├── server/
│   └── security.ts         # Server security helpers and headers
├── src/
│   ├── components/         # Workspace, overlays, analytics, diagnostics, UI
│   ├── services/           # Detection engine and inference orchestration
│   ├── types/              # Detection and application types
│   └── utils/              # Sample data and image export helpers
├── .env.example            # Environment-variable template (no real secrets)
├── SECURITY-REVIEW.md      # Security review and known limitations
├── server.ts               # Express server and detection API
└── package.json
```

## Security and privacy

- Keep real credentials in `.env.local` or your hosting provider's secret store.
- `.env*` files are ignored by Git except for the safe `.env.example` template.
- The Gemini-enabled detection path sends image data to the server and Google Gemini; local TensorFlow.js inference runs in the browser.
- The project does not currently implement user authentication. Review `SECURITY-REVIEW.md` before exposing a deployment publicly.
- Use provider-side API key restrictions and quotas to limit unexpected usage.

## Known limitations

- COCO-SSD is trained on a fixed set of common object categories; it will not reliably identify every product, tool, or fine-grained object.
- Gemini-generated labels and bounding boxes can be incorrect and should be reviewed.
- The `ssd_mobilenet_v2` model assets in this repository are documented as incomplete in `SECURITY-REVIEW.md`; the application may fall back to a remotely loaded model or the included lightweight model. A fully offline, self-hosted model setup is not guaranteed.
- There is no built-in authentication or persistent per-user usage accounting.

## Screenshots

Add screenshots of the real running application here before publishing. For example:

- Main detection workspace
- Detection results with bounding boxes
- Analytics and diagnostic panels

## Contributing

Issues and pull requests are welcome. For substantial changes, describe the problem, the proposed approach, and how you tested it.

## License

No license file was present in the supplied project archive. Add a `LICENSE` file before presenting the project as open source, and choose a license that matches how you want others to use the code.
