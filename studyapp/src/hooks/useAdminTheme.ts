import { useAppTheme } from "../context/ThemeContext";

export function useAdminTheme() {
  const { themeMode, isDark, colors, setThemeMode, toggleTheme } = useAppTheme();

  return {
    themeMode,
    isDark,
    colors,
    setThemeMode,
    toggleTheme,

    // Dynamic style bundles for admin screens
    containerStyle: {
      backgroundColor: colors.adminSidebar,
    },
    contentAreaStyle: {
      backgroundColor: colors.adminBg,
    },
    sidebarStyle: {
      backgroundColor: colors.adminSidebar,
      borderRightColor: colors.adminSidebarBorder,
    },
    topBarStyle: {
      backgroundColor: colors.adminTopBar,
      borderBottomColor: colors.adminTopBarBorder,
    },
    cardStyle: {
      backgroundColor: colors.adminCard,
      borderColor: colors.adminCardBorder,
    },
    searchBarStyle: {
      backgroundColor: colors.adminSearchBg,
      borderColor: colors.adminCardBorder,
    },
    searchInputStyle: {
      color: colors.adminText,
    },
    titleStyle: {
      color: colors.adminText,
    },
    subtitleStyle: {
      color: colors.adminTextSecondary,
    },
    modalCardStyle: {
      backgroundColor: colors.adminCard,
    },
    modalInputStyle: {
      backgroundColor: colors.adminInputBg,
      borderColor: colors.adminInputBorder,
      color: colors.adminText,
    },
  };
}
