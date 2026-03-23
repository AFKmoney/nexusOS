
import React from 'react';
import ForgeSystem from './forge/ForgeSystem';

export default function NeuralForgeApp({ windowId }: { windowId: string }) {
    return <ForgeSystem windowId={windowId} />;
}
