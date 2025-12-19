'use client';

import { useState } from 'react';
import { JoinSessionForm } from '@/components/student/JoinSessionForm';
import { LiveFeedbackInterface } from '@/components/student/LiveFeedbackInterface';

export default function FeedbackPage() {
  const [session, setSession] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);

  return (
    <div className="container mx-auto p-4">
      {!session ? (
        <JoinSessionForm
          onJoin={(sessionData, studentData) => {
            setSession(sessionData);
            setStudentInfo(studentData);
          }}
        />
      ) : (
        <LiveFeedbackInterface
          session={session}
          studentInfo={studentInfo}
          onLeave={() => setSession(null)}
        />
      )}
    </div>
  );
}