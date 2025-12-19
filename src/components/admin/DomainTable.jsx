'use client'

export function DomainTable({ domains, loading }) {
  if (loading) {
    return <p className="text-sm text-gray-500">Loading domains...</p>
  }

  if (!domains?.length) {
    return <p className="text-sm text-gray-500">No domains configured yet.</p>
  }

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700">
              Domain
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">
              Role
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">
              Requires Verification
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {domains.map((d) => (
            <tr key={d._id}>
              <td className="px-3 py-2">{d.domain}</td>
              <td className="px-3 py-2">{d.role}</td>
              <td className="px-3 py-2">
                {d.requiresVerification ? 'Yes' : 'No'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


