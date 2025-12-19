import { connectToDB } from '@/lib/db';
import Topic from '@/models/Topic';
import ProjectSubmission from '@/models/ProjectSubmission';

export async function getTopics() {
  await connectToDB();
  return Topic.find({}).sort({ createdAt: -1 }).lean();
}

export async function getSubmissions() {
  await connectToDB();
  return ProjectSubmission.find({}).sort({ createdAt: -1 }).lean();
}

export async function getActiveTopics() {
  await connectToDB();
  return Topic.find({}).sort({ createdAt: -1 }).lean();
}


