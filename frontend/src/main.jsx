import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import NoiseOverlay from "./components/NoiseOverlay.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NoiseOverlay />
    <App />
  </React.StrictMode>
);
