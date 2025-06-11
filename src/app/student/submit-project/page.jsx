import { ProjectSubmissionForm } from '@/components/student/ProjectSubmissionForm';
import { getActiveTopics } from '@/lib/api';

export default async function SubmitProjectPage() {
  const topics = await getActiveTopics();
  
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Submit Your Project</h1>
      <ProjectSubmissionForm topics={topics} />
    </div>
  );
}