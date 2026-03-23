import React from 'react';
import { File, FileCode, FileJson, FileText, Globe, Image, Music, Video, Database, Settings, FileArchive } from 'lucide-react';
import { vfs } from '../kernel/fileSystem';

export function getSmartIcon(path: string, size: number = 24, className: string = "") {
  // 0. Check for custom icon in metadata
  const node = vfs.stat(path);
  if (node?.customIcon) {
      return <img src={node.customIcon} style={{ width: size, height: size }} className={`object-contain rounded-md shadow-sm ${className}`} alt="icon" />;
  }

  const parts = path.split('/');
  const fileName = parts[parts.length - 1];
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  // 1. Extension Check
  if (ext === 'html' || ext === 'htm') return <Globe size={size} className={`text-orange-500 ${className}`} />;
  if (ext === 'json') return <FileJson size={size} className={`text-yellow-500 ${className}`} />;
  if (ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'jsx' || ext === 'css') return <FileCode size={size} className={`text-blue-400 ${className}`} />;
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif') return <Image size={size} className={`text-purple-400 ${className}`} />;
  if (ext === 'mp3' || ext === 'wav') return <Music size={size} className={`text-pink-400 ${className}`} />;
  if (ext === 'mp4') return <Video size={size} className={`text-red-400 ${className}`} />;
  if (ext === 'nfr') return <FileArchive size={size} className={`text-emerald-500 ${className}`} />;

  // 2. Content Heuristics (Read first 100 chars)
  const content = vfs.readFile(path);
  if (content !== null) {
      const start = content.trim().substring(0, 100);
      
      // Code detection
      if (start.includes('import ') || start.includes('function ') || start.includes('const ') || start.includes('class ') || start.includes('<!DOCTYPE')) {
          return <FileCode size={size} className={`text-blue-400 ${className}`} />;
      }
      
      // Config/JSON detection (if no extension)
      if (start.startsWith('{') || start.startsWith('[')) {
          return <FileJson size={size} className={`text-yellow-500 ${className}`} />;
      }
      
      // Logs
      if (start.startsWith('[') && start.includes(']')) {
          return <Database size={size} className={`text-zinc-400 ${className}`} />;
      }

      // Check for base64 signature of NFR if extension is missing
      if (start.startsWith('data:application/octet-stream;base64')) {
           return <FileArchive size={size} className={`text-emerald-500 ${className}`} />;
      }
  }

  // Fallback
  return <FileText size={size} className={`text-zinc-400 ${className}`} />;
}
