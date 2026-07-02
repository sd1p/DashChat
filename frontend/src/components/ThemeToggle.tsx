"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

// A ghost icon button that flips light/dark. Gated behind a mounted flag so the
// icon (which depends on the client-resolved theme) doesn't cause a hydration
// mismatch against the server's "light" default.
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="size-8 text-chat-header-fg hover:bg-white/10 hover:text-white"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {mounted && isDark ? (
        <Sun className="size-[18px]" />
      ) : (
        <Moon className="size-[18px]" />
      )}
    </Button>
  );
};

export default ThemeToggle;
