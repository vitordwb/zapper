import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { LauncherPresentation, LauncherSurfaceSnapshot } from '../../../shared/launcher-surface';
import { LAUNCHER_LAYOUT } from '../../../shared/launcher-surface';

let nextRequestId = 0;

type SurfaceRefs = {
  search?: RefObject<HTMLElement>;
  results?: RefObject<HTMLElement>;
  answer?: RefObject<HTMLElement>;
  overlay?: RefObject<HTMLElement>;
};

const INITIAL_PREFERENCES: LauncherSurfaceSnapshot['preferences'] = {
  reduceMotion: false, reduceTransparency: true, increaseContrast: false,
  differentiateWithoutColor: false, invertColors: false,
};
const INITIAL: LauncherSurfaceSnapshot = {
  rendererGeneration: 0, requestId: 0, revision: 0, kind: 'search',
  host: { width: LAUNCHER_LAYOUT.searchWidth + 2 * LAUNCHER_LAYOUT.shadowInset,
    height: LAUNCHER_LAYOUT.searchMinHeight + 2 * LAUNCHER_LAYOUT.shadowInset },
  regions: [], material: 'opaque', shadowInset: LAUNCHER_LAYOUT.shadowInset,
  preferences: INITIAL_PREFERENCES, fallbackReason: 'renderer-not-ready',
};

/** One presentation owner: measured content, authoritative main geometry. */
export function useLauncherSurface(kind: LauncherPresentation['kind'], refs: SurfaceRefs, resultsVisible: boolean) {
  const [snapshot, setSnapshot] = useState<LauncherSurfaceSnapshot>(INITIAL);
  const [failure, setFailure] = useState<Error | null>(null);
  const currentKind = useRef(kind);
  currentKind.current = kind;
  const latestRequestId = useRef(0);
  const latestGeneration = useRef(0);
  const generation = snapshot.rendererGeneration;
  const latestRevision = useRef(0);
  const lastSent = useRef('');
  const frame = useRef<number | null>(null);
  const refsCurrent = useRef(refs);
  refsCurrent.current = refs;

  const apply = (next: LauncherSurfaceSnapshot) => {
    if (next.revision < latestRevision.current ||
        (next.rendererGeneration === latestGeneration.current && next.requestId < latestRequestId.current) ||
        (next.rendererGeneration === latestGeneration.current && latestRequestId.current > 0 && next.kind !== currentKind.current)) return;
    if (next.rendererGeneration !== latestGeneration.current) {
      latestGeneration.current = next.rendererGeneration;
      latestRequestId.current = 0;
      nextRequestId = 0;
      lastSent.current = '';
    }
    latestRevision.current = next.revision;
    setSnapshot(next);
  };

  useEffect(() => {
    const unsubscribe = window.electron.onLauncherSurfaceChanged(apply);
    void window.electron.getLauncherSurface().then(apply).catch((error: unknown) => {
      setFailure(error instanceof Error ? error : new Error(String(error)));
    });
    return unsubscribe;
  }, []);

  // Reattach observers whenever the conditional results region mounts or unmounts.
  useLayoutEffect(() => {
    const measure = () => {
      frame.current = null;
      if (generation === 0) return;
      const { search, results, answer, overlay } = refsCurrent.current;
      const height = (ref?: RefObject<HTMLElement>) => ref?.current
        ? Math.max(ref.current.scrollHeight, ref.current.getBoundingClientRect().height) : 0;
      const answerRoot = answer?.current;
      const answerContent = answerRoot?.querySelector<HTMLElement>('[data-sc-answer-content]');
      const intrinsicAnswerHeight = answerRoot && answerContent ? (() => {
        const header = answerRoot.querySelector<HTMLElement>('[data-sc-answer-header]');
        const composer = answerRoot.querySelector<HTMLElement>('[data-sc-answer-composer]');
        const style = getComputedStyle(answerRoot);
        const inset = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const gap = parseFloat(style.rowGap) || 0;
        return Math.ceil((header?.getBoundingClientRect().height || 0) + answerContent.scrollHeight +
          (composer?.getBoundingClientRect().height || 0) + inset + 2 * gap);
      })() : height(answer);
      const panel = overlay?.current?.querySelector<HTMLElement>('[data-sc-overlay-panel]');
      const overlayHeight = panel ? Math.max(panel.scrollHeight, panel.getBoundingClientRect().height)
        + 2 * LAUNCHER_LAYOUT.overlayInset : 0;
      const presentation: LauncherPresentation = kind === 'legacy'
        ? { kind: 'legacy' }
        : kind === 'answer'
          ? { kind: 'answer', contentHeight: intrinsicAnswerHeight, overlayHeight }
          : { kind: 'search', searchHeight: Math.max(LAUNCHER_LAYOUT.searchMinHeight, height(search)),
              resultsHeight: height(results), overlayHeight };
      const appearance = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      const key = JSON.stringify({ presentation, appearance });
      if (lastSent.current === key) return;
      lastSent.current = key;
      const requestId = ++nextRequestId;
      latestRequestId.current = requestId;
      void window.electron.setLauncherSurface({ rendererGeneration: generation, requestId, appearance, presentation })
        .then(next => { setFailure(null); apply(next); })
        .catch((error: unknown) => {
          lastSent.current = '';
          setFailure(error instanceof Error ? error : new Error(String(error)));
          // Retain a readable opaque surface rather than reporting a native attachment.
          setSnapshot(prev => ({ ...prev, kind, material: 'opaque', fallbackReason: 'attachment-failed' }));
        });
    };
    const schedule = () => {
      if (frame.current === null) frame.current = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    for (const ref of Object.values(refs)) if (ref?.current) observer.observe(ref.current);
    const mutation = new MutationObserver(schedule);
    mutation.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    if (refs.overlay?.current) mutation.observe(refs.overlay.current, { childList: true, subtree: true });
    if (refs.answer?.current) mutation.observe(refs.answer.current, { childList: true, subtree: true, characterData: true });
    schedule();
    return () => {
      observer.disconnect(); mutation.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [kind, generation, resultsVisible, refs.search, refs.results, refs.answer, refs.overlay]);

  return { snapshot, failure };
}
