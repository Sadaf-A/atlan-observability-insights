import React, { createContext, useContext, useState, useEffect } from "react";

// Define the theme types
type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}

// Create ThemeContext
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provide the theme context to the app
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeMode;
    return savedTheme || "light";
  });

  // Watch for changes in localStorage (if theme is changed in another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const newTheme = localStorage.getItem("theme") as ThemeMode;
      if (newTheme) setTheme(newTheme);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom Hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
