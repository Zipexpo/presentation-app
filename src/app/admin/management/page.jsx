import { getTopics, getSubmissions } from '@/lib/api';

export const dynamic = 'force-dynamic';

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

function TopicList({ topics }) {
  if (!topics?.length) {
    return <p className="text-sm text-gray-500">No topics created yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {topics.map((topic) => (
        <li
          key={topic._id}
          className="border rounded-md p-3 bg-white shadow-sm"
        >
          <h3 className="font-semibold">{topic.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {topic.description}
          </p>
        </li>
      ))}
    </ul>
  );
}

function CreateTopicButton() {
  return (
    <div className="mt-4">
      <a
        href="/admin/topics/create"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Create New Topic
      </a>
    </div>
  );
}

function SubmissionTable({ submissions }) {
  if (!submissions?.length) {
    return <p className="text-sm text-gray-500">No submissions yet.</p>;
  }

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700">
              Project
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">
              Group
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">
              Submitted At
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {submissions.map((s) => (
            <tr key={s._id}>
              <td className="px-3 py-2">{s.projectName}</td>
              <td className="px-3 py-2">{s.groupNumber ?? '-'}</td>
              <td className="px-3 py-2">
                {s.submittedAt
                  ? new Date(s.submittedAt).toLocaleString()
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExportFeedbackButton() {
  return (
    <div className="mt-4 flex justify-end">
      <button
        type="button"
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
        disabled
      >
        Export Feedback (coming soon)
      </button>
    </div>
  );
}