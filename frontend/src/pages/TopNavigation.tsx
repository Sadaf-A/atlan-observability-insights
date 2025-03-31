import React, { useState, useCallback } from "react";
import { NavLink, Outlet } from "react-router-dom";
import styled from "@emotion/styled";
import { useTheme } from "../context/ThemeContext";
import {
  Activity,
  BarChart2,
  GitCompare,
  ListTree,
  Moon,
  Sun,
  Menu,
} from "lucide-react";

type ThemeMode = "light" | "dark";

interface ThemeColors {
  background: string;
  cardBackground: string;
  primary: string;
  secondary: string;
  text: string;
  inputBorder: string;
  inputBackground: string;
  error: string;
  success: string;
  navHover: string;
  navActive: string;
}

interface NavigationItem {
  path: string;
  name: string;
  icon: React.ReactNode;
}

const themes: Record<ThemeMode, ThemeColors> = {
  light: {
    background: "#FFFFFF",
    cardBackground: "#F4F5F7",
    primary: "#0052CC",
    secondary: "#00B8D9",
    text: "#172B4D",
    inputBorder: "#DFE1E6",
    inputBackground: "#FFFFFF",
    error: "#FF5630",
    success: "#36B37E",
    navHover: "#EBECF0",
    navActive: "#DEEBFF",
  },
  dark: {
    background: "#0D1117",
    cardBackground: "#161B22",
    primary: "#2684FF",
    secondary: "#00C7E6",
    text: "#F4F5F7",
    inputBorder: "#30363D",
    inputBackground: "#21262D",
    error: "#FF5630",
    success: "#36B37E",
    navHover: "#1C2128",
    navActive: "#0C2D6B",
  },
};

const navigationItems: NavigationItem[] = [
  { path: "/dashboard", name: "Dashboard", icon: <BarChart2 size={18} /> },
  { path: "/traces", name: "Trace Viewer", icon: <ListTree size={18} /> },
  {
    path: "/compare",
    name: "Comparative Analysis",
    icon: <GitCompare size={18} />,
  },
];

const HeaderContainer = styled.header<{ themeColors: ThemeColors }>`
  background-color: ${({ themeColors }) => themeColors.cardBackground};
  border-bottom: 1px solid ${({ themeColors }) => themeColors.inputBorder};
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const DesktopNav = styled.nav`
  display: none;

  @media (min-width: 768px) {
    display: flex;
  }
`;

const MobileMenuButton = styled.button`
  background-color: transparent;
  border: none;
  cursor: pointer;
  display: block;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileNav = styled.nav`
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-top: 1px solid
    ${({ theme }: { theme: ThemeColors }) => theme.inputBorder};
`;

const NavItem = styled(NavLink)<{ themeColors: ThemeColors }>`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  margin: 4px 0;
  border-radius: 6px;
  color: ${({ themeColors }) => themeColors.text};
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ themeColors }) => themeColors.navHover};
  }

  &.active {
    background-color: ${({ themeColors }) => themeColors.navActive};
  }
`;

const TopNavigation: React.FC = () => {
  const [darkMode, setDarkMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const currentTheme = themes[darkMode];

  const toggleTheme = useCallback(() => {
    const newTheme = darkMode === "light" ? "dark" : "light";
    setDarkMode(newTheme);
    localStorage.setItem("theme", newTheme);
  }, [darkMode]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: currentTheme.background,
        color: currentTheme.text,
      }}
    >
      <HeaderContainer themeColors={currentTheme}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Activity
              size={24}
              style={{ marginRight: "12px", color: currentTheme.primary }}
            />
            <span
              style={{ fontSize: "18px", fontWeight: 600, marginRight: "40px" }}
            >
              API Monitor
            </span>

            <DesktopNav>
              {navigationItems.map((item) => (
                <NavItem
                  key={item.path}
                  to={item.path}
                  themeColors={currentTheme}
                >
                  <span style={{ marginRight: "8px" }}>{item.icon}</span>
                  {item.name}
                </NavItem>
              ))}
            </DesktopNav>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={toggleTheme}
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: currentTheme.text,
                marginRight: "16px",
              }}
            >
              {darkMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <MobileMenuButton onClick={toggleMobileMenu}>
              <Menu size={24} />
            </MobileMenuButton>
          </div>
        </div>

        {mobileMenuOpen && (
          <MobileNav theme={currentTheme}>
            {navigationItems.map((item) => (
              <NavItem
                key={item.path}
                to={item.path}
                onClick={toggleMobileMenu}
                themeColors={currentTheme}
              >
                <span style={{ marginRight: "12px" }}>{item.icon}</span>
                {item.name}
              </NavItem>
            ))}
          </MobileNav>
        )}
      </HeaderContainer>

      <main
        style={{
          flex: 1,
          padding: "24px",
          overflow: "auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default TopNavigation;
