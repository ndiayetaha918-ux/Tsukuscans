import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";

const splash = document.getElementById("splash");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);

// Fade out the boot splash once React has painted.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    splash?.classList.add("gone");
    setTimeout(() => splash?.remove(), 600);
  });
});
