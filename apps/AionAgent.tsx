
import React from 'react';
import AgentUI from './agent/AgentUI';

export default function NexusPrimeApp({ windowId }: { windowId: string }) {
    return <AgentUI windowId={windowId} />;
}
