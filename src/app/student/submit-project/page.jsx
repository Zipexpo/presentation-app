import Link from 'next/link';
import { getActiveTopics } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SubmitProjectPage() {
  const topics = await getActiveTopics();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-indigo-900">Select Project Topic</h1>

      {topics.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-gray-500 text-lg">No active project topics found.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {topics.map(topic => (
            <Card key={topic._id} className="hover:shadow-lg transition-shadow border-t-4 border-t-indigo-500">
              <CardHeader>
                <CardTitle className="text-xl">{topic.title}</CardTitle>
                <CardDescription className="line-clamp-2">{topic.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-gray-500 gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {topic.submissionDeadline ? new Date(topic.submissionDeadline).toLocaleDateString() : 'No Deadline'}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/student/submit-project/${topic._id}`} className="w-full">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Submit Project</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}