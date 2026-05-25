"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/utils/cn";

interface PopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Popup({
  open,
  onOpenChange,
  title,
  description,
  children,
  className
}: PopupProps) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onOpenChange, open]);

  if (typeof document === "undefined" || !mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (!open) {
          setMounted(false);
        }
      }}
    >
      {open ? (
        <motion.div
          className="fixed inset-0 z-[140] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-[2px]"
            aria-label="Close popup"
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
          <motion.div
            className={cn(
              "relative z-[141] w-full max-w-2xl rounded-md border border-border/70 bg-card shadow-[0_28px_80px_rgba(15,23,42,0.22)]",
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-popup-title"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
              <div className="min-w-0">
                <h2
                  id="shared-popup-title"
                  className="text-[20px] font-semibold tracking-[-0.03em] text-foreground"
                >
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 text-[14px] leading-[22px] text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close popup"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
