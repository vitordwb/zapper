import React from 'react';
import {
  DEFAULT_LAUNCHER_BACKGROUND_OPACITY_PERCENT,
  clampLauncherBackgroundPercent,
  launcherBackgroundBlurPercentToPx,
} from '../utils/launcher-background';

type LauncherSurfaceProps = ({
  region: 'search' | 'results' | 'answer';
  backgroundImageUrl?: never;
  showBackground?: never;
  backgroundBlurPercent?: never;
  backgroundOpacityPercent?: never;
} | {
  region?: never;
  backgroundImageUrl: string;
  showBackground: boolean;
  backgroundBlurPercent: number;
  backgroundOpacityPercent: number;
}) & {
  className?: string;
  regionRef?: React.Ref<HTMLElement>;
  children: React.ReactNode;
};

const LauncherSurface: React.FC<LauncherSurfaceProps> = (props) => {
  const { className = '', children } = props;
  if (props.region) {
    return <section ref={props.regionRef} data-sc-region={props.region} className={['sc-primary-region', 'sc-primary-region--' + props.region, className].join(' ').trim()}>{children}</section>;
  }
  const { backgroundImageUrl, showBackground, backgroundBlurPercent, backgroundOpacityPercent } = props;
  const backgroundOpacity = clampLauncherBackgroundPercent(
    backgroundOpacityPercent,
    DEFAULT_LAUNCHER_BACKGROUND_OPACITY_PERCENT
  ) / 100;
  const backgroundBlurPx = launcherBackgroundBlurPercentToPx(backgroundBlurPercent);

  return (
    <div className="w-full h-full">
      <div className={`glass-effect overflow-hidden h-full flex flex-col relative ${className}`.trim()}>
        {showBackground && backgroundImageUrl ? (
          <div className="launcher-background-media" aria-hidden="true">
            <div
              className="launcher-background-image"
              style={
                {
                  backgroundImage: `url("${backgroundImageUrl}")`,
                  ['--launcher-background-opacity' as any]: String(backgroundOpacity),
                  ['--launcher-background-blur' as any]: `${backgroundBlurPx}px`,
                } as React.CSSProperties
              }
            />
            <div className="launcher-background-tint" />
          </div>
        ) : null}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
};

export default LauncherSurface;
