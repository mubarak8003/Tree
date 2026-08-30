import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share, PlusSquare, CheckCircle } from "lucide-react";

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDevice);

    // Check if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden space-y-5">
        
        {/* Background Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          {/* Custom FTP Logo Box */}
          <div className="w-20 h-20 bg-[#5200FF] rounded-2xl shadow-xl flex items-center justify-center relative overflow-hidden border-2 border-indigo-400/30 group">
            <img 
              src="/icon.svg" 
              alt="FTP Logo" 
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform"
              onError={(e) => {
                // Fallback to text if SVG fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="absolute inset-0 flex flex-col items-center justify-center text-white font-black text-xl tracking-wider font-mono">
              FTP
            </span>
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
              Install FTP App
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Shared Trade Pool - Fractional Trade Platform
            </p>
          </div>
        </div>

        {/* Install Status or Action */}
        {isInstalled ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              App is Already Installed!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You can open FTP directly from your phone's Home Screen anytime.
            </p>
          </div>
        ) : deferredPrompt ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3">
              <Smartphone className="h-6 w-6 text-indigo-500 shrink-0" />
              <span>Install FTP on your Android or Mobile device for instant full-screen trading and notifications.</span>
            </div>

            <button
              onClick={handleInstallClick}
              className="w-full py-3 px-4 bg-[#5200FF] hover:bg-[#4300D6] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Install Application Now</span>
            </button>
          </div>
        ) : isIos ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center">
              To install FTP on iPhone / iPad (Safari):
            </p>
            
            <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <span className="text-slate-700 dark:text-slate-300">
                  Tap the <strong className="text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1"><Share className="h-3.5 w-3.5 inline" /> Share</strong> icon at the bottom of Safari.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <span className="text-slate-700 dark:text-slate-300">
                  Scroll down and select <strong className="text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1"><PlusSquare className="h-3.5 w-3.5 inline" /> Add to Home Screen</strong>.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <Smartphone className="h-4 w-4 text-indigo-500" />
                <span>How to Install on Mobile / Desktop:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-500 dark:text-slate-400">
                <li>Open menu in your mobile browser (3 dots <strong className="text-slate-700 dark:text-slate-200">⋮</strong> or Share icon).</li>
                <li>Tap <strong className="text-indigo-600 dark:text-indigo-400">Add to Home screen</strong> or <strong className="text-indigo-600 dark:text-indigo-400">Install App</strong>.</li>
                <li>The FTP icon will appear directly on your phone home screen!</li>
              </ol>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
