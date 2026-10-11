/** Logical CSS-pixel geometry shared by the host and primary renderer. */
export const LAUNCHER_LAYOUT = {
  searchWidth: 520, answerWidth: 420, legacyWidth: 760, legacyHeight: 480,
  searchMinHeight: 88, resultMinHeight: 60, sectionMinHeight: 28,
  composerMinHeight: 36, controlMinHeight: 32, iconButtonSize: 36,
  resultsGap: 10, resultsMaxHeight: 420, contentMaxHeight: 600,
  screenMargin: 24, shadowInset: 24, searchRadius: 44, resultsRadius: 32,
  answerRadius: 32, resultRadius: 24, resultsInset: 12,
  searchInset: 36, answerInset: 32, composerInset: 16, resultInset: 16,
  resultIconSize: 36, resultIconGap: 16, overlayInset: 12, topFraction: 0.2,
} as const;

export type LauncherAppearance = 'light' | 'dark';
export type LauncherMaterial = 'glass' | 'visual-effect' | 'opaque';
export type LauncherPresentation =
  | { kind: 'search'; searchHeight: number; resultsHeight: number; overlayHeight: number }
  | { kind: 'answer'; contentHeight: number; overlayHeight: number }
  | { kind: 'legacy' };
export interface LauncherSurfaceRequest {
  rendererGeneration: number;
  requestId: number;
  appearance: LauncherAppearance;
  presentation: LauncherPresentation;
}
export interface LauncherSurfaceRegion {
  id: 'search' | 'results' | 'answer' | 'legacy';
  x: number; y: number; width: number; height: number; radius: number;
}
export interface LauncherSurfaceSnapshot {
  rendererGeneration: number;
  requestId: number;
  revision: number;
  kind: LauncherPresentation['kind'];
  host: { width: number; height: number };
  regions: LauncherSurfaceRegion[];
  material: LauncherMaterial;
  shadowInset: number;
  preferences: {
    reduceMotion: boolean; reduceTransparency: boolean; increaseContrast: boolean;
    differentiateWithoutColor: boolean; invertColors: boolean;
  };
  fallbackReason?: 'unsupported' | 'addon-unavailable' | 'attachment-failed' |
    'reduced-transparency' | 'renderer-not-ready';
}
