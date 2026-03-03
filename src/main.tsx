import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme preference
const stored = localStorage.getItem('routinit-profile');
if (stored) {
  const profile = JSON.parse(stored);
  if (profile.darkMode === false) {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
} else {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById("root")!).render(<App />);
