'use client'

import { useSearchParams } from 'next/navigation'

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Authentication Error</h1>
        <p className="text-gray-600">
          Something went wrong while trying to sign you in.
        </p>
        {error && (
          <p className="mt-2 text-sm text-red-600 break-words">
            {decodeURIComponent(error)}
          </p>
        )}
        <a
          href="/login"
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Back to login
        </a>
      </div>
    </div>
  )
}


