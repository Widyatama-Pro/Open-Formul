import type { ReactNode } from "react";
import { ThemeContext, usePortableTheme, type UsePortableThemeOptions } from "./use-theme";

export interface ThemeProviderProps extends UsePortableThemeOptions {
  readonly children: ReactNode;
}

export function ThemeProvider({ children, ...options }: ThemeProviderProps) {
  const themeState = usePortableTheme(options);
  return <ThemeContext.Provider value={themeState}>{children}</ThemeContext.Provider>;
}
