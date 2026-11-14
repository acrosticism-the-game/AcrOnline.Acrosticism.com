// Keeps the browser's "install this app" prompt so a button can open it later.
// Only Chrome, Edge and Android browsers offer this. iPhones have no install button,
// so players there are shown the Add to Home Screen steps instead.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let savedPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// This runs as soon as the app loads, because the browser can fire the event
// before any screen has appeared.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    savedPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    savedPrompt = null;
    notify();
  });
}

export const canPromptInstall = (): boolean => savedPrompt !== null;

// Lets a screen re-check canPromptInstall when the browser makes the prompt available.
export const onInstallChange = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Opens the browser's install dialog. Returns true if the player accepted.
export const promptInstall = async (): Promise<boolean> => {
  if (!savedPrompt) return false;
  const prompt = savedPrompt;
  savedPrompt = null;
  notify();
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    return choice.outcome === "accepted";
  } catch {
    return false;
  }
};

export const isIosDevice = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
