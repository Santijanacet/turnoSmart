import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../../hooks/useTheme';

export function ThemeToggle({ theme, onToggle, variant = 'surface' }: {
  theme: Theme;
  onToggle: () => void;
  variant?: 'sidebar' | 'surface';
}) {
  return (
    <button
      type="button"
      className={variant === 'sidebar' ? 'theme-toggle-btn' : 'theme-toggle-btn-surface'}
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    >
      {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </button>
  );
}
