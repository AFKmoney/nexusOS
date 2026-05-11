import React from 'react';
import { PROCEDURAL_WALLPAPERS } from '../appShellConstants';
import { vfs } from '../kernel/fileSystem';

type DesktopWallpaperProps = {
  wallpaper: string;
};

export default function DesktopWallpaper({ wallpaper }: DesktopWallpaperProps) {
  if (!wallpaper) return null;

  // nexus://procedural/* — bundled procedural wallpapers
  if (wallpaper.startsWith('nexus://procedural/')) {
    const html = PROCEDURAL_WALLPAPERS[wallpaper];
    if (!html) return null;
    return (
      <iframe
        srcDoc={html}
        className="absolute inset-0 w-full h-full border-none pointer-events-none"
        sandbox="allow-scripts"
        title="wallpaper"
      />
    );
  }

  // Inline HTML (library presets stored as full HTML strings)
  if (wallpaper.startsWith('<!DOCTYPE') || wallpaper.startsWith('<html')) {
    return (
      <iframe
        srcDoc={wallpaper}
        className="absolute inset-0 w-full h-full border-none pointer-events-none"
        sandbox="allow-scripts"
        title="wallpaper"
      />
    );
  }

  // VFS path (user-generated wallpapers saved as files)
  if (wallpaper.startsWith('/')) {
    const content = vfs.readFile(wallpaper) ?? '';
    if (content.startsWith('<!DOCTYPE') || content.startsWith('<html')) {
      return (
        <iframe
          srcDoc={content}
          className="absolute inset-0 w-full h-full border-none pointer-events-none"
          sandbox="allow-scripts"
          title="wallpaper"
        />
      );
    }
    return null;
  }

  // Fallback: image URL
  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url('${wallpaper}')` }}
    />
  );
}
