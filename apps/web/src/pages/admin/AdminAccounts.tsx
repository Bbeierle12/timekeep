import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin, type Admin, type CreateAdminPayload } from '../../services/admins';

const roleLabels: Record<Admin['role'], string> = {
  owner: 'Owner',
  admin: 'Administrator',
  read_only: 'Read Only',
  payroll: 'Payroll',
  compliance: 'Compliance'
};

const roleColors: Record<Admin['role'], string> = {
  owner: 'bg-purple-600/20 text-purple-400',
  admin: 'bg-blue-600/20 text-blue-400',
  read_only: 'bg-slate-600/20 text-slate-400',
  payroll: 'bg-green-600/20 text-green-400',
  compliance: 'bg-amber-600/20 text-amber-400'
};

function CreateAdminModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: CreateAdminPayload) => void }) {
  const [formData, setFormData] = useState<CreateAdminPayload>({
    email: '',
    name: '',
    role: 'admin',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Add Admin Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-name" className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              id="admin-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="admin-email" className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              id="admin-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-role" className="block text-sm text-slate-400 mb-1">Role</label>
            <select
              id="admin-role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as Admin['role'] })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="admin">Administrator</option>
              <option value="read_only">Read Only</option>
              <option value="payroll">Payroll</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm text-slate-400 mb-1">Password</label>
            <input
              id="admin-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              required
              minLength={8}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Admin
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function AdminAccounts() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: admins, isLoading, error } = useQuery({
    queryKey: ['admins'],
    queryFn: () => listAdmins(),
    enabled: isAuthenticated
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAdminPayload) => createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setShowCreateModal(false);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdmin(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    }
  });

  const handleDelete = (admin: Admin) => {
    if (admin.role === 'owner') {
      alert('Cannot delete owner account');
      return;
    }
    if (confirm(`Are you sure you want to delete ${admin.name}?`)) {
      deleteMutation.mutate(admin.id);
    }
  };

  return (
    <AdminLayout title="Admin Accounts" subtitle="Manage administrator access">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateModal(true)}>
            Add Admin
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          </div>
        ) : error ? (
          <Card className="p-6">
            <p className="text-red-400">Failed to load admin accounts.</p>
          </Card>
        ) : admins && admins.length > 0 ? (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Name</th>
                  <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Email</th>
                  <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Role</th>
                  <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Status</th>
                  <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">MFA</th>
                  <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Last Login</th>
                  <th className="text-right text-sm font-medium text-slate-400 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-white font-medium">{admin.name}</td>
                    <td className="px-4 py-3 text-slate-300">{admin.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[admin.role]}`}>
                        {roleLabels[admin.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        admin.is_active
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        admin.mfa_enabled
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-slate-600/20 text-slate-400'
                      }`}>
                        {admin.mfa_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {admin.last_login_at
                        ? new Date(admin.last_login_at).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {admin.role !== 'owner' && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleActiveMutation.mutate({
                                id: admin.id,
                                isActive: !admin.is_active
                              })}
                              className="text-sm text-sky-400 hover:text-sky-300"
                            >
                              {admin.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(admin)}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-slate-400">No admin accounts found.</p>
          </Card>
        )}
      </div>

      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
        />
      )}
    </AdminLayout>
  );
}
