
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  
  // Initialize test API for browser console access
  import { initializeTestAPI } from "./services/testHelpers";
  initializeTestAPI();
  
  // Auto-seed data if empty
  import { initializeDataIfNeeded } from "./services/dataSeeder";
  initializeDataIfNeeded().then((result) => {
    if (result.success && result.buildingId) {
      console.log('📦 Datos iniciales cargados');
    }
  });

  createRoot(document.getElementById("root")!).render(<App />);
  