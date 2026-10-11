import { useLayoutEffect, useState } from 'react';
import type React from 'react';

const MENU_INSET = 12;
const MENU_WIDTH = 320;

/** Bound actual measured menu height and coordinates to the available host viewport. */
export function getLauncherMenuGeometry(viewport: { width: number; height: number }, measuredHeight: number, position: { x: number; y: number } | null): React.CSSProperties {
  const inset = Math.min(MENU_INSET, viewport.width / 2, viewport.height / 2);
  const width = Math.max(0, Math.min(MENU_WIDTH, viewport.width - inset * 2));
  const maxHeight = Math.max(0, viewport.height - inset * 2);
  const height = Math.min(measuredHeight, maxHeight);
  const maxLeft = viewport.width - width - inset;
  const maxTop = viewport.height - height - inset;
  const requestedLeft = position?.x ?? maxLeft;
  const requestedTop = position?.y ?? maxTop;
  return {
    position: 'absolute',
    width,
    maxHeight,
    left: Math.min(Math.max(Number.isFinite(requestedLeft) ? requestedLeft : inset, inset), maxLeft),
    top: Math.min(Math.max(Number.isFinite(requestedTop) ? requestedTop : inset, inset), maxTop),
  };
}

/** Position a menu from its measured DOM bounds, not a guessed row count. */
export function useLauncherMenuBounds(
  menuRef: React.RefObject<HTMLDivElement>,
  position: { x: number; y: number } | null
): React.CSSProperties {
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setHeight(menu.getBoundingClientRect().height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(menu);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [menuRef, position?.x, position?.y]);

  return getLauncherMenuGeometry(viewport, height, position);
}

// Secondary browser and web-search views still use their existing visual treatment.
export function getQuickLinkPromptPanelStyle(
  isNativeLiquidGlass: boolean,
  isGlassyTheme: boolean
): React.CSSProperties {
  return isNativeLiquidGlass
    ? {
        background: 'rgba(var(--surface-base-rgb), 0.72)',
        backdropFilter: 'blur(44px) saturate(155%)',
        WebkitBackdropFilter: 'blur(44px) saturate(155%)',
        border: '1px solid rgba(var(--on-surface-rgb), 0.22)',
        boxShadow: '0 18px 38px -12px rgba(var(--backdrop-rgb), 0.26)',
      }
    : isGlassyTheme
    ? {
        background: 'linear-gradient(160deg, rgba(var(--on-surface-rgb), 0.08), rgba(var(--on-surface-rgb), 0.01)), rgba(var(--surface-base-rgb), 0.42)',
        backdropFilter: 'blur(96px) saturate(190%)',
        WebkitBackdropFilter: 'blur(96px) saturate(190%)',
        border: '1px solid var(--ui-panel-border)',
      }
    : {
        background: 'var(--bg-overlay-strong)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid var(--snippet-divider)',
      };
}
