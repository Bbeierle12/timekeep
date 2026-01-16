import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import {
  listEmployees,
  createEmployee,
  Employee,
  CreateEmployeePayload,
  ListEmployeesParams
} from '../../services/employees';
import { routes } from '../../routes';

const createEmployeeSchema = z.object({
  initials: z.string().min(2, 'Initials must be at least 2 characters').max(4, 'Initials must be at most 4 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
  isExempt: z.boolean().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  hireDate: z.string().optional(),
  hourlyRate: z.string().optional()
});

type CreateEmployeeForm = z.infer<typeof createEmployeeSchema>;

export default function AdminEmployees() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<ListEmployeesParams>({ status: 'active' });
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateEmployeeForm>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      isExempt: false
    }
  });

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', filter],
    queryFn: () => listEmployees(filter, token!),
    enabled: !!token
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeePayload) => createEmployee(data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowCreateModal(false);
      reset();
    }
  });

  const onSubmit = (data: CreateEmployeeForm) => {
    const payload: CreateEmployeePayload = {
      initials: data.initials.toUpperCase(),
      fullName: data.fullName,
      pin: data.pin,
      isExempt: data.isExempt,
      email: data.email || null,
      phoneNumber: data.phoneNumber || null,
      hireDate: data.hireDate || null,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null
    };
    createMutation.mutate(payload);
  };

  const filteredEmployees = employees?.filter((employee) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      employee.full_name.toLowerCase().includes(term) ||
      employee.initials.toLowerCase().includes(term) ||
      employee.email?.toLowerCase().includes(term)
    );
  });

  return (
    <AdminLayout title="Employees" subtitle="Manage your workforce">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as ListEmployeesParams['status'] })}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <Button onClick={() => setShowCreateModal(true)}>
            + Add Employee
          </Button>
        </div>
      </div>

      {/* Employee List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      ) : !filteredEmployees?.length ? (
        <Card className="p-8 text-center">
          <p className="text-slate-400">
            {searchTerm ? 'No employees found matching your search.' : 'No employees found.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Initials
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredEmployees.map((employee) => (
                  <EmployeeRow key={employee.id} employee={employee} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Employee Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          reset();
        }}
        title="Add New Employee"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Initials *
              </label>
              <Input
                {...register('initials')}
                placeholder="JD"
                maxLength={4}
                className="uppercase"
              />
              {errors.initials && (
                <p className="text-red-400 text-xs mt-1">{errors.initials.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                PIN *
              </label>
              <Input
                {...register('pin')}
                type="password"
                placeholder="4 digits"
                maxLength={4}
              />
              {errors.pin && (
                <p className="text-red-400 text-xs mt-1">{errors.pin.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Full Name *
            </label>
            <Input
              {...register('fullName')}
              placeholder="John Doe"
            />
            {errors.fullName && (
              <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <Input
                {...register('email')}
                type="email"
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Phone
              </label>
              <Input
                {...register('phoneNumber')}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Hire Date
              </label>
              <Input
                {...register('hireDate')}
                type="date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Hourly Rate
              </label>
              <Input
                {...register('hourlyRate')}
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('isExempt')}
              id="isExempt"
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="isExempt" className="text-sm text-slate-300">
              Exempt Employee (not subject to overtime/meal rules)
            </label>
          </div>

          {createMutation.isError && (
            <p className="text-red-400 text-sm">
              Failed to create employee. Please try again.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

function EmployeeRow({ employee }: { employee: Employee }) {
  return (
    <tr className="hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium text-white">
            {employee.initials.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{employee.full_name}</p>
            {employee.hire_date && (
              <p className="text-xs text-slate-400">
                Hired {new Date(employee.hire_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-300 font-mono">{employee.initials}</span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            employee.is_active
              ? 'bg-green-500/20 text-green-400'
              : 'bg-slate-600/50 text-slate-400'
          }`}
        >
          {employee.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            employee.is_exempt
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}
        >
          {employee.is_exempt ? 'Exempt' : 'Non-Exempt'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          {employee.email && (
            <p className="text-slate-300">{employee.email}</p>
          )}
          {employee.phone_number && (
            <p className="text-slate-400">{employee.phone_number}</p>
          )}
          {!employee.email && !employee.phone_number && (
            <p className="text-slate-500">-</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          to={routes.admin.employeeDetail.replace(':id', employee.id)}
          className="text-sky-400 hover:text-sky-300 text-sm font-medium"
        >
          View
        </Link>
      </td>
    </tr>
  );
}
