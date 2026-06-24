import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useOS } from '../store/osStore';
import {
  Sparkles, Copy, ClipboardPaste, Scissors, Maximize2,
  X, Minimize, Minus, ExternalLink,
  Trash2, FilePlus, Terminal as TerminalIcon,
  Monitor, Bot, FileText, Lock,
  Wand2, Pin, Settings, RefreshCw, Edit3, Info, Activity, Zap, Layers, PinOff,
  LogOut, ArrowDownFromLine, ArrowUpFromLine,
  Bug, FileCode, AlignLeft, Eraser, MessageSquare, Image as ImageIcon,
  FolderOpen, Play, Wallpaper, Languages, Tag, FileSearch, BrainCircuit, Paintbrush
} from 'lucide-react';
import { aiService } from '../services/puterService';
import { vfs, SYSTEM_VFS_APP_ID } from '../kernel/fileSystem';
import { getDesktopPath } from '../appShellConstants';

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

interface NeuralItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void | Promise<void>;
}

export default function ContextMenu() {
  const { 
    contextMenu, closeContextMenu, 
    minimizeWindow, closeWindow, toggleMaximizeWindow, restoreWindow,
    windows, openWindow, clipboard, setClipboard, addNotification, kernelRules,
    pinApp, unpinApp, pinnedApps, registry, logout, updateWindow, setWallpaper, lockShell,
    currentUser, activeWindowId
  } = useOS();
  
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (contextMenu.isOpen && menuRef.current) {
        const { innerWidth, innerHeight } = window;
        const { width, height } = menuRef.current.getBoundingClientRect();
        let { x, y } = contextMenu;
        
        // Edge Collision Detection
        if (x + width > innerWidth) x -= width;
        if (y + height > innerHeight) y -= height;
        if (x < 0) x = 0;
        if (y < 0) y = 0;

        setPosition({ x, y });
    }
  }, [contextMenu.isOpen, contextMenu.x, contextMenu.y]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu.isOpen) {
      window.addEventListener('mousedown', handleClick);
    }
    return () => window.removeEventListener('mousedown', handleClick);
  }, [contextMenu.isOpen, closeContextMenu]);

  if (!contextMenu.isOpen) return null;

  // --- Context Extraction ---
  const targetWindow = contextMenu.targetId ? windows.find(w => w.id === contextMenu.targetId) : undefined;
  
  // Adaptive window retrieval for when user right-clicks INSIDE an app vs on the desktop
  const adaptiveWindow = contextMenu.targetType !== 'taskbar' && contextMenu.targetType !== 'desktop' && contextMenu.targetType !== 'background' && contextMenu.targetType !== 'app-icon' 
      ? windows.find(w => w.id === activeWindowId) 
      : undefined;
  const filePath = contextMenu.filePath || (contextMenu.targetType === 'window' && targetWindow?.data?.path ? targetWindow.data.path : null);
  const selection = contextMenu.textSelection;
  const targetAppId = contextMenu.appId;
  const isPinned = targetAppId ? pinnedApps.includes(targetAppId) : false;
  const targetAppName = targetAppId ? registry.find(a => a.id === targetAppId)?.name : 'App';
  
  // File Type Analysis
  const fileName = filePath?.split('/').pop();
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const isCode = ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'rust'].includes(ext || '');
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
  const isWeb = ext === 'html';
  const isFolder = filePath && !ext && vfs.stat(filePath)?.type === 'directory';

  // --- BASIC ACTIONS ---

  const handleCopy = () => {
    if (selection) {
        navigator.clipboard.writeText(selection);
        addNotification({ title: 'Copied', message: 'Text copied to clipboard.', type: 'info' });
    } else if (filePath) {
        setClipboard({ path: filePath, operation: 'copy' });
        addNotification({ title: 'Copied', message: `${fileName} copied to clipboard.`, type: 'info' });
    }
    closeContextMenu();
  };

  const handleCut = () => {
    if (selection && contextMenu.textElement) {
        navigator.clipboard.writeText(selection);
        // Remove text from input
        const el = contextMenu.textElement;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const val = el.value;
        el.value = val.slice(0, start) + val.slice(end);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        addNotification({ title: 'Cut', message: 'Text cut to clipboard.', type: 'info' });
    } else if (filePath) {
        setClipboard({ path: filePath, operation: 'cut' });
        addNotification({ title: 'Cut', message: `${fileName} cut to clipboard.`, type: 'info' });
    }
    closeContextMenu();
  };

  const handlePaste = async () => {
    if (contextMenu.textElement) {
        try {
            const text = await navigator.clipboard.readText();
            const el = contextMenu.textElement;
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;
            const original = el.value;
            el.value = original.substring(0, start) + text + original.substring(end);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {}
    } 
    else if (clipboard && (contextMenu.targetType === 'desktop' || contextMenu.targetType === 'background')) {
        const sourceName = clipboard.path.split('/').pop() || 'file';
        const content = vfs.readFile(clipboard.path);
        const destDir = contextMenu.filePath || `/home/${currentUser?.id || 'admin'}/Desktop`;
        
        if (content !== null) {
            let newPath = `${destDir}/${sourceName}`;
            if (vfs.stat(newPath)) {
                newPath = `${destDir}/${sourceName.startsWith('Copy_') ? '' : 'Copy_of_'}${sourceName}`;
            }
            
            vfs.writeFile(newPath, content);
            
            if (clipboard.operation === 'cut') {
                vfs.delete(clipboard.path);
                setClipboard(null);
            }
            
            addNotification({ title: 'Pasted', message: `Pasted ${newPath.split('/').pop()}`, type: 'success' });
        }
    }
    closeContextMenu();
  };

  const handleOpen = () => {
      if (filePath) {
          const content = vfs.readFile(filePath);
          // If content is null, it's likely a directory
          if (content === null) openWindow('explorer', { path: filePath });
          else if (filePath.endsWith('.html')) openWindow('netrunner', { path: filePath });
          else openWindow('notepad', { path: filePath, content });
      } else if (targetAppId) {
          openWindow(targetAppId);
      }
      closeContextMenu();
  };

  const handleSetWallpaper = () => {
      if (filePath) {
          const content = vfs.readFile(filePath);
          if (content) {
              setWallpaper(content);
              addNotification({ title: 'Wallpaper', message: 'Background updated.', type: 'success' });
          }
      }
      closeContextMenu();
  };

  const handleDelete = () => {
      if (filePath) {
          vfs.moveToTrash(filePath);
          addNotification({ title: 'Deleted', message: `${fileName} moved to Trash.`, type: 'info' });
      } else if (contextMenu.textElement && selection) {
          // Delete text selection
          const el = contextMenu.textElement;
          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          const val = el.value;
          el.value = val.slice(0, start) + val.slice(end);
          el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      closeContextMenu();
  };

  const handleCreateShortcut = () => {
      if (!filePath) return;
      const targetDir = filePath.substring(0, filePath.lastIndexOf('/'));
      const oldName = filePath.split('/').pop();
      const newPath = `${targetDir}/${oldName} - Shortcut`;
      vfs.createSymlink(filePath, newPath);
      addNotification({ title: 'Shortcut Created', message: `Shortcut created for ${oldName}.`, type: 'success' });
      closeContextMenu();
  };

  const handleAddToDesktop = () => {
      if (!filePath) return;
      const fileName = filePath.split('/').pop() || 'file';
      const desktopPath = getDesktopPath(currentUser?.id ?? null);
      const destPath = `${desktopPath}/${fileName}`;
      // Don't copy if already on the desktop
      if (filePath === destPath) {
          addNotification({ title: 'Already on Desktop', message: `${fileName} is already on the desktop.`, type: 'info' });
          closeContextMenu();
          return;
      }
      const content = vfs.readFile(filePath);
      if (content !== null) {
          vfs.writeFile(destPath, content);
          addNotification({ title: 'Added to Desktop', message: `${fileName} copied to desktop.`, type: 'success' });
      } else {
          // It's a directory — create a symlink instead
          vfs.createSymlink(filePath, destPath);
          addNotification({ title: 'Added to Desktop', message: `Shortcut to ${fileName} created on desktop.`, type: 'success' });
      }
      closeContextMenu();
  };

  const handleAddAppToDesktop = (appId: string) => {
      const app = registry.find(a => a.id === appId);
      if (!app) return;
      const desktopPath = getDesktopPath(currentUser?.id ?? null);
      const shortcutName = `${app.name}.lnk`;
      const destPath = `${desktopPath}/${shortcutName}`;
      // Create a .lnk file that the desktop handler recognizes as an app shortcut
      vfs.writeFile(destPath, `NEXUSOS_APP_SHORTCUT:${appId}`, SYSTEM_VFS_APP_ID);
      addNotification({ title: 'Shortcut Created', message: `${app.name} shortcut added to desktop.`, type: 'success' });
      closeContextMenu();
  };

  const handleRename = () => {
      if (!filePath) return;
      const oldName = filePath.split('/').pop();
      const newName = prompt("Rename:", oldName);
      if (newName && newName !== oldName) {
          const content = vfs.readFile(filePath);
          if (content !== null) {
              const newPath = filePath.replace(oldName!, newName);
              vfs.writeFile(newPath, content);
              vfs.delete(filePath);
          }
      }
      closeContextMenu();
  };

  const handleSetLabel = () => {
      if (!filePath) return;
      const current = vfs.stat(filePath)?.smartLabel || "";
      const label = prompt("Enter overlay label (emoji or short text):", current);
      if (label !== null) {
          vfs.updateMetadata(filePath, { smartLabel: label });
          addNotification({ title: 'Overlay Updated', message: `Label set to "${label}"`, type: 'success' });
      }
      closeContextMenu();
  };

  const handleCreateFile = (type: 'folder' | 'txt') => {
      const dir = contextMenu.filePath || `/home/${currentUser?.id || 'admin'}/Desktop`;
      if (type === 'folder') vfs.createDir(`${dir}/New Folder`);
      else vfs.writeFile(`${dir}/New Text Document.txt`, '');
      closeContextMenu();
  };

  const handleSetCustomIcon = () => {
      fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && filePath) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const base64 = event.target?.result as string;
              vfs.updateMetadata(filePath, { customIcon: base64 });
              addNotification({ title: 'Icon Updated', message: 'Custom icon applied successfully.', type: 'success' });
              closeContextMenu();
          };
          reader.readAsDataURL(file);
      }
  };

  const handleClearCustomIcon = () => {
      if (filePath) {
          vfs.updateMetadata(filePath, {});
          addNotification({ title: 'Icon Reset', message: 'Custom icon removed.', type: 'info' });
      }
      closeContextMenu();
  };

  // --- AI ACTIONS ---

  const handleAiEditInPlace = async (instruction: string) => {
      closeContextMenu();
      const el = contextMenu.textElement;
      if (!el) return;

      const currentText = selection || el.value;
      if (!currentText) return;

      addNotification({ title: 'Neural Writer', message: 'Processing text...', type: 'info' });

      try {
          const prompt = `
            Task: ${instruction}
            Input Text: "${currentText}"
            Rule: Return ONLY the updated text. No explanations.
          `;
          const result = await aiService.generateOnce(prompt, kernelRules);
          
          if (!result) throw new Error("Empty response");

          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          const original = el.value;
          
          if (start !== end) {
              // Replace selection
              el.value = original.substring(0, start) + result.trim() + original.substring(end);
          } else {
              // Replace all
              el.value = result.trim();
          }
          
          el.dispatchEvent(new Event('input', { bubbles: true }));
          addNotification({ title: 'Complete', message: 'Text updated successfully.', type: 'success' });
      } catch (e) {
          addNotification({ title: 'Error', message: 'Neural processing failed.', type: 'error' });
      }
  };

  const handleCustomAiModify = () => {
      const instruction = prompt("How should AI modify this content?");
      if (instruction) {
          handleAiEditInPlace(instruction);
      } else {
          closeContextMenu();
      }
  };

  const handleModifyWindowContent = async () => {
      if (!targetWindow || targetWindow.data?.content === undefined) {
          closeContextMenu();
          return;
      }
      
      const instruction = prompt(`How should AI modify this window?`);
      closeContextMenu();
      
      if (!instruction) return;
      
      addNotification({ title: 'Neural Modifier', message: `Processing ${targetWindow.title}...`, type: 'info' });

      try {
          const current = targetWindow.data.content;
          const systemPrompt = `
            You are a direct text processing engine.
            User Instruction: ${instruction}
            
            Current Content:
            """
            ${typeof current === 'string' ? current : JSON.stringify(current)}
            """
            
            TASK: Transform the content based on the instruction.
            CRITICAL OUTPUT RULES:
            1. Return ONLY the final result text. 
            2. Do NOT wrap in markdown code blocks.
            3. Do NOT include phrases like "Here is the modified text".
            4. Maintain the original format (HTML, JSON, or Plain Text) unless asked to change it.
          `;
          
          const result = await aiService.generateOnce(systemPrompt, kernelRules);
          
          // Cleanup potential markdown wrappers just in case
          const clean = result.replace(/^```[a-z]*\n?|```$/gi, '').trim();
          
          updateWindow(targetWindow.id, { 
              data: { ...targetWindow.data, content: clean } 
          });
          
          addNotification({ title: 'Complete', message: 'Window content updated.', type: 'success' });
      } catch (e) {
          addNotification({ title: 'Error', message: 'Modification failed.', type: 'error' });
      }
  };

  const handleAskAI = (overridePrompt?: string) => {
      closeContextMenu();
      let context = "";
      let prompt = overridePrompt || "";

      if (selection) {
          context = selection;
          if (!prompt) prompt = "Explain or analyze this text.";
      } else if (filePath) {
          const content = vfs.readFile(filePath);
          context = content ? content.substring(0, 3000) : "File is empty.";
          if (!prompt) prompt = `Analyze this file (${filePath.split('/').pop()}):`;
      } else if (targetWindow) {
          prompt = `Explain the application "${targetWindow.title}".`;
      } else if (targetAppId) {
          prompt = `What is "${targetAppName}"?`;
      }

      openWindow('aion_agent', { 
          initialContext: context,
          initialPrompt: prompt
      });
  };

  const handleModifyApp = () => {
      closeContextMenu();
      if (filePath) {
          openWindow('forge', { 
              mode: 'edit', 
              targetPath: filePath, 
              autoPrompt: "Refactor or improve this code.",
              autoRun: false 
          });
      }
  };

  const handleGenerateIconAI = async () => {
      if (!filePath) return;
      closeContextMenu();
      const name = filePath.split('/').pop();
      addNotification({ title: 'Neural Forge', message: `Generating icon for ${name}...`, type: 'info' });

      try {
          const prompt = `Design a high-quality, modern, glowing app icon for a file named "${name}". Minimalist, cyberpunk style, dark background, emerald or purple accents.`;
          const b64 = await aiService.generateImage(prompt);
          if (b64) {
              vfs.updateMetadata(filePath, { customIcon: b64 });
              addNotification({ title: 'Icon Applied', message: 'Neural icon generation complete.', type: 'success' });
          } else {
              throw new Error("Generation returned null");
          }
      } catch (e) {
          addNotification({ title: 'Generation Failed', message: 'Could not visualize icon.', type: 'error' });
      }
  };

  const handleOrganize = async () => {
      closeContextMenu();
      const targetDir = contextMenu.filePath || `/home/${currentUser?.id || 'admin'}/Desktop`;
      addNotification({ title: 'Neural Organizer', message: 'Sorting directory...', type: 'info' });
      const files = vfs.listDir(targetDir);
      const prompt = `Organize these files into logical JSON folders: ${JSON.stringify(files)}. Return {"FolderName": ["file1"]}.`;
      try {
          const res = await aiService.generateOnce(prompt, kernelRules, 'json');
          const plan = JSON.parse(res.replace(/```json|```/g, '').trim());

          vfs.batch(() => {
              const moves: { oldPath: string, newPath: string }[] = [];
              Object.keys(plan).forEach(folder => {
                  vfs.createDir(`${targetDir}/${folder}`);
                  plan[folder].forEach((f: string) => {
                      moves.push({
                          oldPath: `${targetDir}/${f}`,
                          newPath: `${targetDir}/${folder}/${f}`
                      });
                  });
              });
              if (moves.length > 0) {
                  vfs.moveMany(moves);
              }
          });

          addNotification({ title: 'Organized', message: 'Directory structure optimized.', type: 'success' });
      } catch(e) { console.error(e); }
  };

  // --- RENDER HELPERS ---

  const Separator = () => <div className="h-px bg-white/10 my-1 mx-2" />;
  
  const MenuItem = ({ icon: Icon, label, onClick, danger = false, disabled = false, shortcut }: MenuItemProps) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-left transition-colors
        ${danger ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-zinc-300 hover:bg-white/10 hover:text-white'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
    >
        <div className="flex items-center gap-3">
            <Icon size={18} /> 
            <span>{label}</span>
        </div>
        {shortcut && <span className="text-xs text-zinc-600 font-mono">{shortcut}</span>}
    </button>
  );

  const NeuralItem = ({ icon: Icon, label, onClick }: NeuralItemProps) => (
      <button 
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-1.5 text-[13px] text-left transition-colors text-purple-200 hover:bg-purple-500/20 hover:text-white group relative overflow-hidden"
      >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Icon size={18} className="text-purple-400 group-hover:animate-pulse relative z-10" /> 
          <span className="relative z-10 font-medium">{label}</span>
      </button>
  );

  const SubHeader = ({ label }: { label: string }) => (
     <div className="px-3 py-1.5 text-xs font-bold text-zinc-600 uppercase tracking-widest mt-1">{label}</div>
  );

  return (
    <div 
      ref={menuRef}
      className="fixed z-[9999] min-w-[240px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-1 animate-in fade-in zoom-in-95 duration-100 select-none flex flex-col ring-1 ring-white/5"
      style={{ left: position.x, top: position.y }}
    >
        {/* Hidden File Input for Custom Icons */}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={onFileSelected}
        />

        {/* Header / Title */}
        <div className="px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1 truncate max-w-[240px] flex items-center gap-2">
            {contextMenu.targetType === 'text' && <AlignLeft size={14}/>}
            {contextMenu.targetType === 'window' && <Monitor size={14}/>}
            {contextMenu.targetType === 'icon' && <FileText size={14}/>}
            {contextMenu.targetType === 'desktop' && <Monitor size={14}/>}
            
            {contextMenu.targetType === 'text' && (contextMenu.textElement ? "Input Field" : "Selection")}
            {(contextMenu.targetType === 'desktop' || contextMenu.targetType === 'background') && "System"}
            {contextMenu.targetType === 'icon' && (fileName || "File")}
            {contextMenu.targetType === 'window' && "Window Controls"}
            {contextMenu.targetType === 'taskbar' && "Taskbar"}
            {contextMenu.targetType === 'app-icon' && targetAppName}
        </div>

        {/* --- DYNAMIC SECTIONS --- */}

        {/* 1. TEXT INPUTS & SELECTION */}
        {contextMenu.targetType === 'text' && (
            <>
                {contextMenu.textElement && (
                    <MenuItem icon={Scissors} label="Cut" onClick={handleCut} shortcut="Ctrl+X" />
                )}
                <MenuItem icon={Copy} label="Copy" onClick={handleCopy} shortcut="Ctrl+C" />
                {contextMenu.textElement && (
                    <MenuItem icon={ClipboardPaste} label="Paste" onClick={handlePaste} shortcut="Ctrl+V" />
                )}
                {contextMenu.textElement && selection && (
                    <MenuItem icon={Trash2} label="Delete" onClick={handleDelete} shortcut="Del" />
                )}
                
                {contextMenu.textElement && (
                    <>
                        <Separator />
                        <SubHeader label="Neural Writer" />
                        <NeuralItem icon={Sparkles} label="Enhance with AI..." onClick={handleCustomAiModify} />
                        <NeuralItem icon={Wand2} label="Fix Grammar & Spelling" onClick={() => handleAiEditInPlace("Fix grammar and spelling errors.")} />
                        <NeuralItem icon={Languages} label="Translate to Spanish" onClick={() => handleAiEditInPlace("Translate to Spanish.")} />
                        <NeuralItem icon={Zap} label="Complete Sentence" onClick={() => handleAiEditInPlace("Complete this thought or sentence.")} />
                        <NeuralItem icon={Eraser} label="Clear Field" onClick={() => { if(contextMenu.textElement) { contextMenu.textElement.value = ''; closeContextMenu(); } }} />
                    </>
                )}

                {!contextMenu.textElement && selection && (
                    <>
                         <Separator />
                         <NeuralItem icon={MessageSquare} label="Explain Selection" onClick={() => handleAskAI()} />
                         <NeuralItem icon={Wand2} label="Rewrite with AI" onClick={() => handleAskAI("Rewrite this text.")} />
                    </>
                )}
            </>
        )}

        {/* 2. FILES (ICONS) */}
        {contextMenu.targetType === 'icon' && filePath && (
            <>
                <MenuItem icon={ExternalLink} label="Open" onClick={handleOpen} />
                {isWeb && <MenuItem icon={Play} label="Run App" onClick={handleOpen} />}
                <MenuItem icon={Scissors} label="Cut" onClick={handleCut} />
                <MenuItem icon={Copy} label="Copy" onClick={handleCopy} />
                <MenuItem icon={ExternalLink} label="Create Shortcut" onClick={handleCreateShortcut} />
                <MenuItem icon={Monitor} label="Add to Desktop" onClick={handleAddToDesktop} />
                <MenuItem icon={Edit3} label="Rename" onClick={handleRename} />
                <MenuItem icon={Tag} label="Change Overlay..." onClick={handleSetLabel} />
                
                <Separator />
                
                {/* Specific File Actions */}
                {isImage && (
                     <MenuItem icon={Wallpaper} label="Set as Wallpaper" onClick={handleSetWallpaper} />
                )}
                
                {/* Neural Actions */}
                <SubHeader label="Neural Operations" />
                {isCode ? (
                    <>
                        <NeuralItem icon={MessageSquare} label="Explain Code" onClick={() => handleAskAI("Explain this code logic.")} />
                        <NeuralItem icon={Bug} label="Find Bugs" onClick={() => handleAskAI("Analyze this code for potential bugs.")} />
                        {isWeb && <NeuralItem icon={FileCode} label="Modify App (Forge)" onClick={handleModifyApp} />}
                    </>
                ) : (
                    <>
                         <NeuralItem icon={FileSearch} label="Summarize Content" onClick={() => handleAskAI("Summarize this document in 3 bullet points.")} />
                         <NeuralItem icon={BrainCircuit} label="Deep Analyze File" onClick={() => handleAskAI("Analyze the file structure, purpose, and potential context of this content.")} />
                    </>
                )}
                <NeuralItem icon={Paintbrush} label="Generate Icon" onClick={handleGenerateIconAI} />
                
                <Separator />
                
                <MenuItem icon={ImageIcon} label="Upload Icon..." onClick={handleSetCustomIcon} />
                <MenuItem icon={X} label="Reset Icon" onClick={handleClearCustomIcon} />
                
                <MenuItem icon={Info} label="Properties" onClick={() => { openWindow('properties', { path: filePath }); closeContextMenu(); }} />
                <MenuItem icon={Trash2} label="Delete" onClick={handleDelete} danger shortcut="Del" />
            </>
        )}

        {/* 3. APP ICONS */}
        {contextMenu.targetType === 'app-icon' && (
            <>
                <MenuItem icon={ExternalLink} label="Launch New Instance" onClick={handleOpen} />
                <MenuItem 
                    icon={isPinned ? PinOff : Pin} 
                    label={isPinned ? "Unpin from Taskbar" : "Pin to Taskbar"} 
                    onClick={() => { isPinned ? unpinApp(targetAppId ?? '') : pinApp(targetAppId ?? ''); closeContextMenu(); }} 
                />
                <Separator />
                <NeuralItem icon={Info} label="About Application" onClick={() => handleAskAI()} />
            </>
        )}

        {/* 4. WINDOWS */}
        {contextMenu.targetType === 'window' && targetWindow && (
            <>
                <MenuItem icon={targetWindow.isMaximized ? Minimize : Maximize2} label={targetWindow.isMaximized ? "Restore" : "Maximize"} onClick={() => { toggleMaximizeWindow(targetWindow.id); closeContextMenu(); }} />
                <MenuItem icon={Minimize} label="Minimize" onClick={() => { minimizeWindow(targetWindow.id); closeContextMenu(); }} />
                <Separator />
                
                {isWeb && <NeuralItem icon={FileCode} label="Inspect Source" onClick={handleModifyApp} />}
                <NeuralItem icon={Bot} label="Explain App" onClick={() => handleAskAI()} />
                
                {/* NEW FEATURE: MODIFY WINDOW CONTENT */}
                {targetWindow.data?.content !== undefined && (
                    <NeuralItem icon={Wand2} label="Modify with AI" onClick={handleModifyWindowContent} />
                )}
                
                <Separator />
                <MenuItem icon={X} label="Close Window" onClick={() => { closeWindow(targetWindow.id); closeContextMenu(); }} danger shortcut="Alt+F4" />
            </>
        )}

        {/* 5. DESKTOP / BACKGROUND */}
        {(contextMenu.targetType === 'desktop' || contextMenu.targetType === 'background') && (
            <>
                <MenuItem icon={RefreshCw} label="Refresh" onClick={() => window.location.reload()} />
                <Separator />
                <MenuItem icon={FilePlus} label="New File" onClick={() => handleCreateFile('txt')} />
                <MenuItem icon={FolderOpen} label="New Folder" onClick={() => handleCreateFile('folder')} />
                <MenuItem 
                    icon={ClipboardPaste} 
                    label={clipboard ? `Paste ${clipboard.path.split('/').pop()}` : 'Paste'} 
                    onClick={handlePaste} 
                    disabled={!clipboard} 
                />
                
                <Separator />
                <SubHeader label="Add App to Desktop" />
                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                    {registry.filter(a => !a.hidden).slice(0, 12).map(app => {
                        const AppIcon = app.icon;
                        return (
                            <MenuItem
                                key={app.id}
                                icon={AppIcon}
                                label={app.name}
                                onClick={() => handleAddAppToDesktop(app.id)}
                            />
                        );
                    })}
                </div>
                
                <Separator />
                <SubHeader label="System Tools" />
                <MenuItem icon={TerminalIcon} label="Terminal" onClick={() => { openWindow('terminal'); closeContextMenu(); }} />
                <MenuItem icon={Wallpaper} label="Wallpaper" onClick={() => { openWindow('wallpaper'); closeContextMenu(); }} />
                <MenuItem icon={Settings} label="Settings" onClick={() => { openWindow('settings'); closeContextMenu(); }} />
                
                <Separator />
                <NeuralItem icon={Layers} label="Auto-Organize Desktop" onClick={handleOrganize} />
            </>
        )}

        {/* 6. TASKBAR */}
        {contextMenu.targetType === 'taskbar' && (
            <>
                <SubHeader label="Workspace" />
                <MenuItem icon={ArrowDownFromLine} label="Minimize All" onClick={() => { windows.forEach(w => minimizeWindow(w.id)); closeContextMenu(); }} />
                <MenuItem icon={ArrowUpFromLine} label="Restore All" onClick={() => { windows.forEach(w => restoreWindow(w.id)); closeContextMenu(); }} />
                <NeuralItem icon={Sparkles} label="Neural Arrange" onClick={() => { 
                    useOS.getState().autoArrangeWindows(); 
                    closeContextMenu(); 
                }} />
                
                <Separator />
                <SubHeader label="System" />
                <MenuItem icon={Activity} label="Task Manager" onClick={() => { openWindow('monitor'); closeContextMenu(); }} />
                <MenuItem icon={Settings} label="Settings" onClick={() => { openWindow('settings'); closeContextMenu(); }} />
                <MenuItem icon={Lock} label="Lock System" onClick={() => { lockShell(); closeContextMenu(); }} />
                <MenuItem icon={LogOut} label="Logout" onClick={() => { logout(); closeContextMenu(); }} />
                
                <Separator />
                <MenuItem icon={Trash2} label="Close All Windows" onClick={() => { if(confirm("Close all windows?")) windows.forEach(w => closeWindow(w.id)); closeContextMenu(); }} danger />
            </>
        )}

        {/* 7. UNIVERSAL IN-APP WINDOW CONTROLS */}
        {adaptiveWindow && contextMenu.targetType !== 'window' && (
            <>
                <Separator />
                <SubHeader label="Window Controls" />
                <MenuItem icon={adaptiveWindow.isMaximized ? Minimize : Maximize2} label={adaptiveWindow.isMaximized ? "Restore" : "Maximize"} onClick={() => { toggleMaximizeWindow(adaptiveWindow.id); closeContextMenu(); }} />
                <MenuItem icon={Minus} label="Minimize" onClick={() => { minimizeWindow(adaptiveWindow.id); closeContextMenu(); }} />
                <MenuItem icon={X} label="Close App" onClick={() => { closeWindow(adaptiveWindow.id); closeContextMenu(); }} danger shortcut="Alt+Q" />
            </>
        )}

    </div>
  );
}
