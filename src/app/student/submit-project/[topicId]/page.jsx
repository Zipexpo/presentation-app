'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TopicSubmissionForm from '@/components/student/TopicSubmissionForm';

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

    if (loading) return <div className="container mx-auto p-6">Loading...</div>;
    if (error) return <div className="container mx-auto p-6 text-red-600">Error: {error}</div>;

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
