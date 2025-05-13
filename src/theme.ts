import { createTheme, ThemeOptions, PaletteOptions } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    tertiary: Palette["primary"];
  }
  interface PaletteOptions {
    tertiary?: PaletteOptions["primary"];
  }
}

const lightPalette: PaletteOptions = {
  primary: { main: "#005B82" }, // Dark blue
  secondary: { main: "#0072CE" }, // Blue
  tertiary: { main: "#E5E5E5" }, // Light grey
  text: { primary: "#1B1B1B", secondary: "#005B82" },
  background: { default: "#FFFAFA", paper: "#F8F7F7" },
};

const darkPalette: PaletteOptions = {
  primary: { main: "#005B82" }, // Dark blue
  secondary: { main: "#0072CE" }, // Blue
  tertiary: { main: "#161717" }, // Dark grey
  text: { primary: "#FFFFFF" },
  background: { default: "#353535", paper: "#161717" },
};

const themeOptions: ThemeOptions = {
  typography: {
    fontFamily: ["Calibri", "Cambria", "sans-serif"].join(","),
    fontSize: 12,
    h1: { fontFamily: ["Calibri", "Cambria", "sans-serif"].join(","), fontSize: 40 },
    h2: { fontFamily: ["Calibri", "Cambria", "sans-serif"].join(","), fontSize: 32 },
    h3: { fontFamily: ["Calibri", "Cambria", "sans-serif"].join(","), fontSize: 24 },
    h4: { fontFamily: ["Calibri", "Cambria", "sans-serif"].join(","), fontSize: 20 },
    h5: { fontFamily: ["Calibri", "Cambria", "sans-serif"].join(","), fontSize: 16 },
    h6: { fontFamily: ["Calibri", "Cambria", "sans-serif"].join(","), fontSize: 14 },
  },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
    MuiIconButton: { styleOverrides: { root: { "&:hover": { backgroundColor: "#2879AA25" } } } },
  },
  breakpoints: {
    values: { xs: 360, sm: 430, md: 768, lg: 1280, xl: 1920 },
  },
};

export const theme = createTheme({
  ...themeOptions,
  colorSchemes: {
    light: { palette: lightPalette },
    //: { palette: darkPalette },
  },
});

export default theme;