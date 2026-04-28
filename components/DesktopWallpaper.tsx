import React from 'react';
import { PROCEDURAL_WALLPAPERS, isWallpaperHtmlDocument } from '../appShellConstants';

type DesktopWallpaperProps = {
  wallpaper: string;
};

export default function DesktopWallpaper({
  wallpaper
}: DesktopWallpaperProps) {
  if (isWallpaperHtmlDocument(wallpaper)) {
    return (
      <iframe
        srcDoc={PROCEDURAL_WALLPAPERS[wallpaper] || wallpaper}
        className="absolute inset-0 w-full h-full border-none pointer-events-none"
      />
    );
  }

  return (
    <div
      className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
      style={{ backgroundImage: `url('${wallpaper}')` }}
    />
  );
}