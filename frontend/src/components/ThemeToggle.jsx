import React from "react";
import { Button } from "@heroui/react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ isDarkMode, toggleTheme }) {
  return (
    <Button
      isIconOnly
      variant="light"
      radius="full"
      aria-label="Смена темы"
      onClick={toggleTheme}
      size="lg" 
      className="text-default-500 hover:text-default-900 w-8 h-8"
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </Button>
  );
}