'use client';

import Link from 'next/link';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  profilePictureUrl?: string;
  jobTitle?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface UsersTableProps {
  users: User[];
  onUserAction: (userId: string, action: 'suspend' | 'activate' | 'delete') => void;
}

export function UsersTable({ users, onUserAction }: UsersTableProps) {
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      Admin: 'bg-purple-100 text-purple-800',
      PM: 'bg-blue-100 text-blue-800',
      FieldTech: 'bg-green-100 text-green-800',
      Office: 'bg-yellow-100 text-yellow-800',
      ClientViewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by inviting a new team member.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Login
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    {user.profilePictureUrl ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={user.profilePictureUrl}
                        alt=""
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                        {user.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <Link
                      href={`/users/${user.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {user.fullName}
                    </Link>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.jobTitle && (
                      <div className="text-xs text-gray-400">{user.jobTitle}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.isActive ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Suspended
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.lastLoginAt
                  ? format(new Date(user.lastLoginAt), 'MMM d, yyyy')
                  : 'Never'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/users/${user.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </Link>
                  {user.isActive ? (
                    <button
                      onClick={() => onUserAction(user.id, 'suspend')}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => onUserAction(user.id, 'activate')}
                      className="text-green-600 hover:text-green-900"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => onUserAction(user.id, 'delete')}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
