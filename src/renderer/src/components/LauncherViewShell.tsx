import React from 'react';
import LauncherSurface from './LauncherSurface';

type LauncherViewShellProps = {
  backgroundImageUrl: string;
  showBackground: boolean;
  backgroundBlurPercent: number;
  backgroundOpacityPercent: number;
  className?: string;
  children: React.ReactNode;
};

export default function LauncherViewShell(props: LauncherViewShellProps) {
  return (
    <LauncherSurface
      backgroundImageUrl={props.backgroundImageUrl}
      showBackground={props.showBackground}
      backgroundBlurPercent={props.backgroundBlurPercent}
      backgroundOpacityPercent={props.backgroundOpacityPercent}
      className={props.className}
    >
      {props.children}
    </LauncherSurface>
  );
}
