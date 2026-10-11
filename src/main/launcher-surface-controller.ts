import {
  LAUNCHER_LAYOUT as L,
  type LauncherMaterial,
  type LauncherPresentation,
  type LauncherSurfaceRequest,
  type LauncherSurfaceRegion,
  type LauncherSurfaceSnapshot,
} from '../shared/launcher-surface';

export interface LauncherRect { x: number; y: number; width: number; height: number }
export interface LauncherPoint { x: number; y: number }
export interface LauncherSurfacePlacement {
  bounds: LauncherRect;
  snapshot: LauncherSurfaceSnapshot;
}
type Preferences = LauncherSurfaceSnapshot['preferences'];
type FallbackReason = LauncherSurfaceSnapshot['fallbackReason'];

export const DEFAULT_LAUNCHER_PREFERENCES: Preferences = {
  reduceMotion: false, reduceTransparency: false, increaseContrast: false,
  differentiateWithoutColor: false, invertColors: false,
};

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));
const validNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function validateWorkArea(area: LauncherRect): LauncherRect {
  if (!area || !Number.isFinite(area.x) || !Number.isFinite(area.y) ||
      !validNumber(area.width) || !validNumber(area.height) ||
      area.width === 0 || area.height === 0) {
    throw new RangeError('Invalid launcher work area');
  }
  return { ...area };
}

function validatePresentation(value: unknown): asserts value is LauncherPresentation {
  if (!value || typeof value !== 'object') throw new TypeError('Invalid launcher presentation');
  const presentation = value as Record<string, unknown>;
  switch (presentation.kind) {
    case 'legacy': return;
    case 'search':
      if (validNumber(presentation.searchHeight) && validNumber(presentation.resultsHeight) &&
          validNumber(presentation.overlayHeight)) return;
      break;
    case 'answer':
      if (validNumber(presentation.contentHeight) && validNumber(presentation.overlayHeight)) return;
      break;
  }
  throw new TypeError('Invalid launcher presentation');
}

/** No Electron/AppKit imports: main applies each returned bounds/regions as one coordinated update. */
export class LauncherSurfaceController {
  private sender: object;
  private workArea: LauncherRect;
  private anchor: { centerX: number; topY: number };
  private presentation: LauncherPresentation = { kind: 'search', searchHeight: L.searchMinHeight, resultsHeight: 0, overlayHeight: 0 };
  private appearance: LauncherSurfaceRequest['appearance'] = 'dark';
  private preferences: Preferences;
  private generation = 0;
  private requestId = 0;
  private revision = 0;
  private ready = false;
  private material: LauncherMaterial = 'opaque';
  private fallbackReason: FallbackReason = 'renderer-not-ready';
  private placement: LauncherSurfacePlacement;

  constructor(sender: object, workArea: LauncherRect, preferences: Preferences = DEFAULT_LAUNCHER_PREFERENCES) {
    this.sender = sender;
    this.workArea = validateWorkArea(workArea);
    this.preferences = { ...preferences };
    this.anchor = this.defaultAnchor();
    this.placement = this.layout();
  }

  private assertSender(sender: object): void {
    if (sender !== this.sender) throw new Error('Launcher surface sender is not the live main window');
  }

  private defaultAnchor(): { centerX: number; topY: number } {
    const area = this.workArea;
    return { centerX: area.x + area.width / 2, topY: area.y + area.height * L.topFraction + L.shadowInset };
  }

  private layout(): LauncherSurfacePlacement {
    const area = this.workArea;
    const primary = this.presentation.kind !== 'legacy';
    // On tiny displays shrink margins and then inset; neither may make the host negative.
    const marginX = Math.min(L.screenMargin, area.width / 4);
    const marginY = Math.min(L.screenMargin, area.height / 4);
    const insetX = primary ? Math.min(L.shadowInset, Math.max(0, (area.width - 2 * marginX) / 4)) : 0;
    const insetY = primary ? Math.min(L.shadowInset, Math.max(0, (area.height - 2 * marginY) / 4)) : 0;
    const maxWidth = Math.max(0, area.width - 2 * marginX - 2 * insetX);
    const maxHeight = Math.max(0, area.height - 2 * marginY - 2 * insetY);
    const contentCap = Math.min(L.contentMaxHeight, maxHeight);
    const regions: LauncherSurfaceRegion[] = [];
    let contentWidth: number;
    let contentHeight: number;
    if (this.presentation.kind === 'legacy') {
      contentWidth = Math.min(L.legacyWidth, area.width - 2 * marginX);
      contentHeight = Math.min(L.legacyHeight, area.height - 2 * marginY);
      regions.push({ id: 'legacy', x: 0, y: 0, width: contentWidth, height: contentHeight, radius: 0 });
    } else if (this.presentation.kind === 'answer') {
      contentWidth = Math.min(L.answerWidth, maxWidth);
      contentHeight = Math.min(contentCap, Math.max(this.presentation.contentHeight, this.presentation.overlayHeight));
      regions.push({ id: 'answer', x: insetX, y: insetY, width: contentWidth,
        height: contentHeight, radius: Math.min(L.answerRadius, contentHeight / 2, contentWidth / 2) });
    } else {
      contentWidth = Math.min(L.searchWidth, maxWidth);
      const expanded = this.presentation.resultsHeight > 0;
      const gap = expanded && contentCap > 0 ? Math.min(L.resultsGap, contentCap) : 0;
      const minResults = expanded ? Math.min(L.resultMinHeight, Math.max(0, contentCap - gap)) : 0;
      const requestedSearch = Math.max(L.searchMinHeight, this.presentation.searchHeight);
      const searchHeight = Math.min(requestedSearch, Math.max(0, contentCap - gap - minResults));
      const resultsHeight = expanded ? Math.min(
        L.resultsMaxHeight, Math.max(this.presentation.resultsHeight, minResults),
        Math.max(0, contentCap - searchHeight - gap),
      ) : 0;
      contentHeight = Math.min(contentCap, Math.max(searchHeight + (resultsHeight ? gap + resultsHeight : 0), this.presentation.overlayHeight));
      regions.push({ id: 'search', x: insetX, y: insetY, width: contentWidth,
        height: searchHeight, radius: Math.min(L.searchRadius, searchHeight / 2, contentWidth / 2) });
      if (resultsHeight > 0) regions.push({ id: 'results', x: insetX, y: insetY + searchHeight + gap,
        width: contentWidth, height: resultsHeight,
        radius: Math.min(L.resultsRadius, resultsHeight / 2, contentWidth / 2) });
    }
    const width = contentWidth + 2 * insetX;
    const height = contentHeight + 2 * insetY;
    const x = clamp(this.anchor.centerX - width / 2, area.x + marginX, area.x + area.width - marginX - width);
    // Keep the same visual top until the content needs more room below it.
    const y = clamp(this.anchor.topY - insetY, area.y + marginY, area.y + area.height - marginY - height);
    const material: LauncherMaterial = this.ready && !this.preferences.reduceTransparency ? this.material : 'opaque';
    const fallbackReason = this.preferences.reduceTransparency ? 'reduced-transparency' :
      !this.ready ? 'renderer-not-ready' : this.fallbackReason;
    const snapshot: LauncherSurfaceSnapshot = {
      rendererGeneration: this.generation, requestId: this.requestId, revision: ++this.revision,
      kind: this.presentation.kind, host: { width, height }, regions, material,
      shadowInset: primary ? Math.min(insetX, insetY) : 0,
      preferences: { ...this.preferences }, ...(fallbackReason ? { fallbackReason } : {}),
    };
    return { bounds: { x, y, width, height }, snapshot };
  }

  private update(): LauncherSurfacePlacement {
    this.placement = this.layout();
    return this.placement;
  }

  get(): LauncherSurfacePlacement { return this.placement; }

  /** Call on navigation/recovery; old requests and readiness acknowledgments become invalid. */
  beginRendererGeneration(sender: object): number {
    this.sender = sender;
    this.generation++;
    this.requestId = 0;
    this.ready = false;
    this.material = 'opaque';
    this.fallbackReason = 'renderer-not-ready';
    this.update();
    return this.generation;
  }

  rendererReady(sender: object, generation: number): LauncherSurfacePlacement {
    this.assertSender(sender);
    if (generation !== this.generation) throw new Error('Stale launcher renderer readiness');
    if (!this.ready) {
      this.ready = true;
      this.fallbackReason = undefined;
      this.update();
    }
    return this.placement;
  }

  request(sender: object, request: LauncherSurfaceRequest): LauncherSurfacePlacement {
    this.assertSender(sender);
    if (!request || !Number.isSafeInteger(request.rendererGeneration) ||
        !Number.isSafeInteger(request.requestId) || request.requestId <= 0 ||
        (request.appearance !== 'light' && request.appearance !== 'dark')) {
      throw new TypeError('Invalid launcher surface request');
    }
    validatePresentation(request.presentation);
    if (request.rendererGeneration !== this.generation || request.requestId <= this.requestId) {
      throw new Error('Stale launcher surface request');
    }
    this.requestId = request.requestId;
    this.presentation = request.presentation;
    this.appearance = request.appearance;
    return this.update();
  }

  setWorkArea(workArea: LauncherRect): LauncherSurfacePlacement {
    this.workArea = validateWorkArea(workArea);
    return this.update();
  }

  /** Recenter on the invocation display; a drag remains effective until the next invocation. */
  show(workArea: LauncherRect): LauncherSurfacePlacement {
    this.workArea = validateWorkArea(workArea);
    this.anchor = this.defaultAnchor();
    return this.update();
  }

  /** Only call for actual user moves, never for a programmatic setBounds/move event. */
  move(bounds: LauncherRect): LauncherPoint {
    if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) throw new RangeError('Invalid launcher move');
    this.anchor = { centerX: bounds.x + this.placement.bounds.width / 2,
      topY: bounds.y + (this.presentation.kind === 'legacy' ? 0 : this.placement.snapshot.regions[0]?.y ?? 0) };
    this.update();
    return { x: this.placement.bounds.x + this.placement.bounds.width / 2 - L.shadowInset - L.searchWidth / 2,
      y: this.anchor.topY - L.shadowInset };
  }

  resetAnchor(): LauncherSurfacePlacement {
    this.anchor = this.defaultAnchor();
    return this.update();
  }

  /** Supply only the actual native attachment outcome, never an OS-version guess. */
  setMaterial(material: LauncherMaterial, fallbackReason?: FallbackReason): LauncherSurfacePlacement {
    if (material !== 'glass' && material !== 'visual-effect' && material !== 'opaque') throw new TypeError('Invalid launcher material');
    this.material = material;
    this.fallbackReason = fallbackReason;
    return this.update();
  }

  setPreferences(preferences: Preferences): LauncherSurfacePlacement {
    this.preferences = { ...preferences };
    return this.update();
  }
}
