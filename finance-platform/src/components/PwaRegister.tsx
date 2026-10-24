"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
      console.error("Service worker registration failed:", error);
    });

    function handleBeforeInstallPrompt(event: Event) {
      if (!("prompt" in event) || typeof event.prompt !== "function") return;
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch (error) {
      console.error("PWA installation prompt failed:", error);
    } finally {
      setInstalling(false);
    }
  }

  if (!installPrompt) return null;

  return (
    <button
      className="flex h-11 w-full items-center gap-3 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
      disabled={installing}
      onClick={installApp}
      type="button"
    >
      <Download aria-hidden="true" size={18} strokeWidth={1.8} />
      {installing ? "Opening install..." : "Install App"}
    </button>
  );
}
