import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import Topic from '@/models/Topic';
import Class from '@/models/Class';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const email = searchParams.get('email');
        const topicId = searchParams.get('topicId');
        const name = searchParams.get('name');

        if (!studentId && !email && !name) {
            return NextResponse.json({ error: 'Missing query' }, { status: 400 });
        }

        await connectToDB();

        const query = {};
        if (studentId) query.studentId = studentId;
        if (email) query.email = email;
        if (name) {
            query.name = { $regex: name, $options: 'i' }; // Case-insensitive regex
        }

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

        // If searching by name, we might get multiple results
        if (name) {
            const users = await User.find(query, 'name email studentId').limit(10).lean();
            return NextResponse.json({ found: users.length > 0, users });
        }

        // ID/Email usually unique
        const user = await User.findOne(query, 'name email studentId').lean();

        if (user) {
            return NextResponse.json({ found: true, user });
        } else {
            return NextResponse.json({ found: false });
        }

    } catch (error) {
        console.error('Check user error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
