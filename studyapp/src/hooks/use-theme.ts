/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

export function useTheme() {
  try {
    const { isDark } = useAppTheme();
    return isDark ? Colors.dark : Colors.light;
  } catch {
    return Colors.light;
  }
}

