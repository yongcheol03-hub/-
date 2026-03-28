
import JSZip from 'jszip';

export const downloadSourceCode = async () => {
  const zip = new JSZip();
  const src = zip.folder("src");
  const publicDir = zip.folder("public");
  const views = src?.folder("views");
  const utils = src?.folder("utils");

  // 1. Root Files
  zip.file("package.json", `{
  "name": "misedust-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.294.0",
    "jszip": "^3.10.1",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}`);

  zip.file("index.html", `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>미세먼지어플</title>
    <meta name="theme-color" content="#ffffff">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/1903/1903172.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body {
        background-color: #f3f4f6;
        color: #111827;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        overscroll-behavior-y: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>`);

  // 2. Public Files
  publicDir?.file("manifest.json", `{
  "name": "미세먼지어플",
  "short_name": "미세먼지",
  "id": "misedust-app-v1",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "orientation": "portrait",
  "icons": [
    {
      "src": "https://cdn-icons-png.flaticon.com/512/1903/1903172.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}`);

  // 3. Src Files
  src?.file("index.tsx", `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`);

  src?.file("types.ts", `export interface AttachedImage {
  name: string;
  dataUrl: string;
}

export interface RawDataForm {
  testLocation: string;
  receptionNumber: string;
  inspectStartDate: string;
  inspectEndDate: string;
  model: string;
  serialNumber: string;
  spanFilm: string;
  midFilm: string;
  span1: string;
  flowRate: string;
  repeat1: string;
  linearity: string;
  repeat2: string;
  blank1: string;
  repeat3: string;
  blank2: string;
  span2: string;
  blank3: string;
  attachedImages: AttachedImage[];
}

export const INITIAL_FORM_DATA: RawDataForm = {
  testLocation: '',
  receptionNumber: '',
  inspectStartDate: new Date().toISOString().split('T')[0],
  inspectEndDate: new Date().toISOString().split('T')[0],
  model: '',
  serialNumber: '',
  spanFilm: '',
  midFilm: '',
  span1: '',
  flowRate: '',
  repeat1: '',
  linearity: '',
  repeat2: '',
  blank1: '',
  repeat3: '',
  blank2: '',
  span2: '',
  blank3: '',
  attachedImages: [],
};`);

  // Download
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = "MiseDustApp_Project.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
