'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Calendar, Presentation, Users, BookOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function Home() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm w-full">
        <div className={"flex w-full justify-between max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-4"}>
          <div>

            <div className="flex items-center">
              <Presentation className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">PresentX</span>
            </div>
            </div>
            <div className="flex items-center space-x-4">
              {session ? (
                <>
                  <Link
                    href={
                      session.user.role === 'admin'
                        ? '/admin/management'
                        : session.user.role === 'teacher'
                        ? '/teacher'
                        : '/student'
                    }
                  >
                    <Button variant="outline">Dashboard</Button>
                  </Link>
                  <Link href="/logout">
                    <Button>Sign Out</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline">Login</Button>
                  </Link>
                  <Link href="/register">
                    <Button>Register</Button>
                  </Link>
                </>
              )}
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Streamline Your Classroom Presentations
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            A comprehensive platform for managing student presentations, feedback, and evaluations
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            {session ? (
              <Link
                href={
                  session.user.role === 'admin'
                    ? '/admin/management'
                    : session.user.role === 'teacher'
                    ? '/teacher'
                    : '/student'
                }
              >
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <Button size="lg">Get Started</Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">
                    {feature.name}
                  </h3>
                </div>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        {!session && (
          <div className="mt-20 bg-indigo-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                  Ready to transform your classroom?
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-xl text-indigo-100">
                  Join hundreds of educators using our platform to streamline presentations
                </p>
                <div className="mt-8">
                  <Link href="/register">
                    <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50">
                      Register Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} PresentX. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    name: 'Presentation Scheduling',
    description: 'Easily schedule presentation sessions with customizable time slots',
    icon: Calendar,
  },
  {
    name: 'Student Submissions',
    description: 'Students can submit projects with all required materials in one place',
    icon: FileText,
  },
  {
    name: 'Live Feedback',
    description: 'Real-time feedback and Q&A during presentations',
    icon: Users,
  },
  {
    name: 'Rubric Management',
    description: 'Create and apply custom rubrics for consistent evaluation',
    icon: BookOpen,
  },
  {
    name: 'Automated Timing',
    description: 'Automatic timers with alerts to keep presentations on schedule',
    icon: Presentation,
  },
  {
    name: 'Analytics Dashboard',
    description: 'Detailed analytics on student performance and feedback trends',
    icon: Users,
  },
];