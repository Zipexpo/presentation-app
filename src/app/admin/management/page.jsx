import { getTopics, getSubmissions } from '@/lib/api';

export default async function ManagementPage() {
  const topics = await getTopics();
  const submissions = await getSubmissions();
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Presentation Management</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Topics Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Topics</h2>
          <TopicList topics={topics} />
          <CreateTopicButton />
        </section>
        
        {/* Submissions Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Student Submissions</h2>
          <SubmissionTable submissions={submissions} />
          <ExportFeedbackButton />
        </section>
      </div>
    </div>
  );
}