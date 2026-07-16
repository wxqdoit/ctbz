import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WalletProviders from "@/components/WalletProviders";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProviders>
      <App />
    </WalletProviders>
  </StrictMode>,
);
