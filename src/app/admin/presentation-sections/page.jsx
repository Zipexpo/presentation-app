'use client';

import { useState } from 'react';
import { PresentationController } from '@/components/admin/PresentationController';
import { SessionList } from '@/components/admin/SessionList';

export default function PresentationSectionsPage() {
  const [activeSession, setActiveSession] = useState(null);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Presentation Sessions</h1>
      
      {activeSession ? (
        <PresentationController 
          session={activeSession} 
          onClose={() => setActiveSession(null)}
        />
      ) : (
        <SessionList onSelectSession={setActiveSession} />
      )}
    </div>
  );
}