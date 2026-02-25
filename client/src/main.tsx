import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { API_BASE_URL, withApiBase } from "@/lib/runtime-config";

if (API_BASE_URL) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      return originalFetch(withApiBase(input), init);
    }

    if (input instanceof URL) {
      return originalFetch(withApiBase(input.toString()), init);
    }

    const nextUrl = withApiBase(input.url);
    if (nextUrl !== input.url) {
      return originalFetch(new Request(nextUrl, input), init);
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;
}

createRoot(document.getElementById("root")!).render(<App />);
