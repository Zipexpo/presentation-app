'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TopicSubmissionForm from '@/components/student/TopicSubmissionForm';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentTopicSubmissionPage() {
    const { topicId } = useParams();
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [existingSubmission, setExistingSubmission] = useState(null);

    useEffect(() => {
        if (topicId) {
            fetch(`/api/student/topic/${topicId}`, { cache: 'no-store' })
                .then(res => {
                    if (!res.ok) throw new Error('Topic not found');
                    return res.json();
                })
                .then(data => {
                    // API now returns { topic: {...}, existingSubmission: {...} }
                    if (data.topic) {
                        setTopic(data.topic);
                        // We'll store existing submission in local state if needed, or pass it down
                        // For simplicity, let's add it to state
                        setExistingSubmission(data.existingSubmission);
                    } else {
                        // Fallback for old API structure if any cache issues (unlikely)
                        setTopic(data);
                    }
                })
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [topicId]);


    // ...

    if (loading) return (
        <div className="container mx-auto p-6 max-w-3xl">
            {/* Header Skeleton */}
            <div className="mb-8 border-b pb-4 space-y-3">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/4 mt-2" />
            </div>

            {/* Form Skeleton */}
            <div className="max-w-2xl mx-auto space-y-8 my-8">
                {/* Hero */}
                <Skeleton className="h-48 sm:h-64 w-full rounded-xl" />

                {/* Inputs */}
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-20 rounded-full" />
                        <Skeleton className="h-10 flex-1" />
                    </div>
                    <Skeleton className="h-14 w-full" />

                    {/* Members */}
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    if (error) return (
        <div className="container mx-auto p-6 max-w-3xl">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-red-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 w-8 h-8"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-red-900">Unable to Load Topic</h2>
                    <p className="text-red-700 mt-1">{error}</p>
                </div>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white border border-red-300 rounded text-red-700 hover:bg-red-50 transition text-sm font-medium">
                    Try Again
                </button>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-6 max-w-3xl">
            <div className="mb-8 border-b pb-4">
                <h1 className="text-3xl font-bold mb-2">{topic.title}</h1>
                <p className="text-gray-600">{topic.description}</p>
                <div className="text-sm text-gray-500 mt-2">
                    Deadline: {topic.submissionDeadline ? new Date(topic.submissionDeadline).toLocaleString() : 'None'}
                </div>
            </div>

            <TopicSubmissionForm
                topicId={topicId}
                topicConfig={{ ...topic.submissionConfig, resourceRequirements: topic.resourceRequirements || [] }}
                existingSubmission={topic.existingSubmission || existingSubmission}
            />
        </div>
    );
}
