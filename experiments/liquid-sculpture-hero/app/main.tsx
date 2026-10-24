import "@fontsource-variable/geist";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import Demo from "@/app/demo";
import "@/app/globals.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
