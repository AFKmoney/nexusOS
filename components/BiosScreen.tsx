import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { Cpu, HardDrive, ShieldAlert, Zap, RotateCcw } from 'lucide-react';
import { sounds } from '../kernel/sounds';

export default function BiosScreen({ onExit }: { onExit: () => void }) {
    const { kernelRules, updateKernelRules, systemReset } = useOS();
    
    const [selectedTab, setSelectedTab] = useState<'Main' | 'Advanced' | 'Security' | 'Boot' | 'Exit'>('Main');
    const [activeRow, setActiveRow] = useState(0);

    const tabs = ['Main', 'Advanced', 'Security', 'Boot', 'Exit'] as const;

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            e.preventDefault();
            if (e.key === 'ArrowRight') {
                setSelectedTab(prev => {
                    const currentIndex = tabs.indexOf(prev);
                    return tabs[(currentIndex + 1) % tabs.length] ?? prev;
                });
                setActiveRow(0);
            }
            if (e.key === 'ArrowLeft') {
                setSelectedTab(prev => {
                    const currentIndex = tabs.indexOf(prev);
                    return tabs[(currentIndex - 1 + tabs.length) % tabs.length] ?? prev;
                });
                setActiveRow(0);
            }
            if (e.key === 'ArrowDown') {
                setActiveRow(prev => prev + 1);
            }
            if (e.key === 'ArrowUp') {
                setActiveRow(prev => Math.max(0, prev - 1));
            }
            // Configuration toggles
            if (e.key === 'Enter') {
                sounds.click();
                if (selectedTab === 'Security' && activeRow === 0) {
                    updateKernelRules({ secureBoot: !kernelRules.secureBoot });
                }
                if (selectedTab === 'Advanced' && activeRow === 0) {
                    const speeds = [1.2, 2.4, 3.4, 4.2, 5.0];
                    const currentSpeed = kernelRules.cpuSpeed ?? 3.4;
                    const next = speeds[(speeds.indexOf(currentSpeed) + 1) % speeds.length];
                    if (next !== undefined) {
                        updateKernelRules({ cpuSpeed: next });
                    }
                }
                if (selectedTab === 'Boot' && activeRow === 0) {
                    const devices = ['VFS', 'CLOUD', 'GGUF'] as const;
                    const currentDevice = kernelRules.primaryBootDevice ?? 'VFS';
                    const next = devices[(devices.indexOf(currentDevice) + 1) % devices.length];
                    if (next !== undefined) {
                        updateKernelRules({ primaryBootDevice: next });
                    }
                }
                if (selectedTab === 'Exit') {
                    if (activeRow === 0) onExit();
                    if (activeRow === 1) systemReset(true);
                }
            }
            if (e.key === 'Escape' || e.key === 'F10') {
                onExit();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedTab, activeRow, kernelRules, updateKernelRules, onExit, systemReset]);

    return (
        <div className="fixed inset-0 z-[20000] bg-[#0000aa] text-[#aaaaaa] font-mono text-sm flex flex-col uppercase select-none">
            {/* Header */}
            <div className="bg-[#aaaaaa] text-[#0000aa] text-center font-bold py-1 mb-8">
                NexusOS BIOS Setup Utility - Daemon Version 4.2.0
            </div>

            {/* Tabs */}
            <div className="flex gap-8 px-12 mb-8 text-[#aaaaaa] font-bold">
                {tabs.map(tab => (
                    <div key={tab} className={`${selectedTab === tab ? 'text-white' : ''} pb-1 border-b-2 ${selectedTab === tab ? 'border-white' : 'border-transparent'}`}>
                        {tab}
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 px-12 flex">
                <div className="w-1/2 space-y-4">
                    {selectedTab === 'Main' && (
                        <>
                            <div className="flex justify-between">
                                <span>System Time</span>
                                <span className="text-white">[{new Date().toLocaleTimeString()}]</span>
                            </div>
                            <div className="flex justify-between">
                                <span>System Date</span>
                                <span className="text-white">[{new Date().toLocaleDateString()}]</span>
                            </div>
                            <div className="flex justify-between mt-8">
                                <span>System Memory</span>
                                <span>8192 MB (Virtual)</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Base OS Mapping</span>
                                <span>DAEMON Kernel v4</span>
                            </div>
                        </>
                    )}

                    {selectedTab === 'Advanced' && (
                        <>
                            <div className={`flex justify-between p-1 ${activeRow === 0 ? 'bg-[#aaaaaa] text-[#0000aa]' : ''}`}>
                                <span>Virtual CPU Clock Speed</span>
                                <span className={activeRow === 0 ? '' : 'text-white'}>[{kernelRules.cpuSpeed ?? 3.4} GHz]</span>
                            </div>
                            <div className={`flex justify-between p-1 ${activeRow === 1 ? 'bg-[#aaaaaa] text-[#0000aa]' : ''}`}>
                                <span>Autonomy Engine Injection</span>
                                <span className={activeRow === 1 ? '' : 'text-white'}>[Enabled]</span>
                            </div>
                        </>
                    )}

                    {selectedTab === 'Security' && (
                        <>
                            <div className={`flex justify-between p-1 ${activeRow === 0 ? 'bg-[#aaaaaa] text-[#0000aa]' : ''}`}>
                                <span>AI Secure Boot State</span>
                                <span className={activeRow === 0 ? '' : 'text-white'}>[{kernelRules.secureBoot ? 'Enabled' : 'Disabled'}]</span>
                            </div>
                            <div className="mt-8 text-[#5555ff]">
                                WARNING: Disabling Secure Boot allows unsigned DAEMON processes to modify the kernel.
                            </div>
                        </>
                    )}

                    {selectedTab === 'Boot' && (
                        <>
                            <div className={`flex justify-between p-1 ${activeRow === 0 ? 'bg-[#aaaaaa] text-[#0000aa]' : ''}`}>
                                <span>Primary Boot Device</span>
                                <span className={activeRow === 0 ? '' : 'text-white'}>[{kernelRules.primaryBootDevice ?? 'VFS'}]</span>
                            </div>
                            <div className="mt-2 pl-4 text-[#5555ff]">{'>'} Network Boot (PXE)</div>
                            <div className="pl-4 text-[#5555ff]">{'>'} USB Virtual Drive</div>
                        </>
                    )}

                    {selectedTab === 'Exit' && (
                        <>
                            <div className={`p-1 ${activeRow === 0 ? 'bg-[#aaaaaa] text-[#0000aa]' : ''}`}>
                                Save Changes and Exit
                            </div>
                            <div className={`p-1 ${activeRow === 1 ? 'bg-[#aaaaaa] text-[#0000aa]' : ''}`}>
                                Wipe NVRAM (Factory Reset OS)
                            </div>
                        </>
                    )}
                </div>
                
                {/* Info Panel Right */}
                <div className="w-1/2 border-l border-[#aaaaaa] ml-8 pl-8 text-[#5555ff]">
                    <div className="mb-4 text-white">Item Specific Help</div>
                    {selectedTab === 'Security' && activeRow === 0 && 'Enables or disables cryptographic verification of AI processes before execution.'}
                    {selectedTab === 'Advanced' && activeRow === 0 && 'Adjusts the clock multiplier for the simulated CPU. Higher speeds consume more browser memory.'}
                    {selectedTab === 'Exit' && activeRow === 1 && 'WARNING: This will completely destroy the VFS state and local storage.'}
                    
                    <div className="mt-auto absolute bottom-12 right-12 text-[#aaaaaa]">
                        <div>← → Select Screen</div>
                        <div>↑ ↓ Select Item</div>
                        <div>Enter Change Option</div>
                        <div>F10 / ESC Save and Exit</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-[#aaaaaa] text-[#0000aa] py-1 px-4 flex justify-between">
                <span>v02.14 (C) Copyright 1985-2026, Nexus Megacorp.</span>
                <span>DAEMON OVERRIDE ENABLED</span>
            </div>
        </div>
    );
}
