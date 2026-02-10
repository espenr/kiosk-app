import { ReactNode, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeWrapperProps {
  children: ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { themeConfig } = useTheme();

  // Apply theme styles to document
  useEffect(() => {
    const root = document.documentElement;

    // Apply background and text colors
    document.body.style.backgroundColor = themeConfig.backgroundColor;
    document.body.style.color = themeConfig.textColor;

    // Apply font size
    root.style.fontSize = `${themeConfig.fontSizeBase}px`;

    // Apply CSS variables for theme colors
    root.style.setProperty('--color-primary', themeConfig.primaryColor);
    root.style.setProperty('--color-accent', themeConfig.accentColor);

    // Apply transitions
    document.body.style.transition = 'background-color 0.3s, color 0.3s';
  }, [themeConfig]);

  return (
    <div className="w-full h-screen">
      {children}
    </div>
  );
}