import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import Topic from '@/models/Topic';
import Class from '@/models/Class';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const email = searchParams.get('email');
    const topicId = searchParams.get('topicId'); // New Param

    if (!studentId && !email) {
        return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    await connectToDB();

    const query = {};
    if (studentId) query.studentId = studentId;
    if (email) query.email = email;

    // Restriction Logic
    if (topicId) {
        const topic = await Topic.findById(topicId);
        if (topic && topic.classId) {
            const classDoc = await Class.findById(topic.classId);
            if (classDoc && classDoc.students?.length > 0) {
                // RESTRICT: User must be in this list
                query._id = { $in: classDoc.students };
            }
        }
    }

    const user = await User.findOne(query, 'name email studentId').lean();

    if (user) {
        return NextResponse.json({ found: true, user });
    } else {
        return NextResponse.json({ found: false });
    }
}
