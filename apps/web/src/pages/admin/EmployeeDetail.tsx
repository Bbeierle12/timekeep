import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  getEmployee,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
  resetEmployeePin,
  UpdateEmployeePayload
} from '../../services/employees';
import { routes } from '../../routes';

const editEmployeeSchema = z.object({
  initials: z.string().min(2, 'Initials must be at least 2 characters').max(4, 'Initials must be at most 4 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  isExempt: z.boolean(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  hireDate: z.string().optional(),
  hourlyRate: z.string().optional(),
  notes: z.string().optional()
});

type EditEmployeeForm = z.infer<typeof editEmployeeSchema>;

const resetPinSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
  confirmPin: z.string()
}).refine((data) => data.pin === data.confirmPin, {
  message: 'PINs do not match',
  path: ['confirmPin']
});

type ResetPinForm = z.infer<typeof resetPinSchema>;

export default function AdminEmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id!, token!),
    enabled: !!token && !!id
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<EditEmployeeForm>({
    resolver: zodResolver(editEmployeeSchema),
    values: employee ? {
      initials: employee.initials,
      fullName: employee.full_name,
      isExempt: employee.is_exempt,
      email: employee.email || '',
      phoneNumber: employee.phone_number || '',
      hireDate: employee.hire_date || '',
      hourlyRate: employee.hourly_rate?.toString() || '',
      notes: employee.notes || ''
    } : undefined
  });

  const {
    register: registerPin,
    handleSubmit: handleSubmitPin,
    reset: resetPinForm,
    formState: { errors: pinErrors }
  } = useForm<ResetPinForm>({
    resolver: zodResolver(resetPinSchema)
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateEmployeePayload) => updateEmployee(id!, data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEditing(false);
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateEmployee(id!, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowDeactivateModal(false);
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateEmployee(id!, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });

  const resetPinMutation = useMutation({
    mutationFn: (pin: string) => resetEmployeePin(id!, pin, token!),
    onSuccess: () => {
      setShowResetPinModal(false);
      resetPinForm();
    }
  });

  const onSubmit = (data: EditEmployeeForm) => {
    const payload: UpdateEmployeePayload = {
      initials: data.initials.toUpperCase(),
      fullName: data.fullName,
      isExempt: data.isExempt,
      email: data.email || null,
      phoneNumber: data.phoneNumber || null,
      hireDate: data.hireDate || null,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
      notes: data.notes || null
    };
    updateMutation.mutate(payload);
  };

  const onResetPin = (data: ResetPinForm) => {
    resetPinMutation.mutate(data.pin);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Employee Details" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !employee) {
    return (
      <AdminLayout title="Employee Details" subtitle="Error">
        <Card className="p-6">
          <p className="text-red-400 mb-4">Failed to load employee details.</p>
          <Button onClick={() => navigate(routes.admin.employees)}>
            Back to Employees
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={employee.full_name}
      subtitle={`${employee.initials} - ${employee.is_active ? 'Active' : 'Inactive'}`}
    >
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to={routes.admin.employees}
          className="text-sky-400 hover:text-sky-300 text-sm"
        >
          &larr; Back to Employees
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Employee Information</h2>
              {!isEditing && (
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Initials
                    </label>
                    <Input
                      {...register('initials')}
                      className="uppercase"
                      maxLength={4}
                    />
                    {errors.initials && (
                      <p className="text-red-400 text-xs mt-1">{errors.initials.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Full Name
                    </label>
                    <Input {...register('fullName')} />
                    {errors.fullName && (
                      <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email
                    </label>
                    <Input {...register('email')} type="email" />
                    {errors.email && (
                      <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Phone
                    </label>
                    <Input {...register('phoneNumber')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Hire Date
                    </label>
                    <Input {...register('hireDate')} type="date" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Hourly Rate
                    </label>
                    <Input {...register('hourlyRate')} type="number" step="0.01" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('isExempt')}
                    id="isExempt"
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                  />
                  <label htmlFor="isExempt" className="text-sm text-slate-300">
                    Exempt Employee
                  </label>
                </div>

                {updateMutation.isError && (
                  <p className="text-red-400 text-sm">Failed to update employee.</p>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isDirty || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Initials" value={employee.initials} />
                  <InfoField label="Full Name" value={employee.full_name} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Email" value={employee.email || '-'} />
                  <InfoField label="Phone" value={employee.phone_number || '-'} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField
                    label="Hire Date"
                    value={employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
                  />
                  <InfoField
                    label="Hourly Rate"
                    value={employee.hourly_rate ? `$${employee.hourly_rate.toFixed(2)}` : '-'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField
                    label="Employee Type"
                    value={employee.is_exempt ? 'Exempt' : 'Non-Exempt'}
                  />
                  <InfoField
                    label="Status"
                    value={employee.is_active ? 'Active' : 'Inactive'}
                  />
                </div>
                {employee.notes && (
                  <InfoField label="Notes" value={employee.notes} />
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Actions Panel */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => setShowResetPinModal(true)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Reset PIN
              </Button>
              <Link
                to={`${routes.admin.timeEntries}?employee=${employee.id}`}
                className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View Time Entries
              </Link>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Account Status</h3>
            {employee.is_active ? (
              <Button
                variant="secondary"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => setShowDeactivateModal(true)}
              >
                Deactivate Employee
              </Button>
            ) : (
              <div>
                <Button
                  className="w-full"
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                >
                  {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate Employee'}
                </Button>
                {employee.deactivated_at && (
                  <p className="text-xs text-slate-400 mt-2">
                    Deactivated on {new Date(employee.deactivated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Metadata</h3>
            <div className="space-y-1 text-xs text-slate-400">
              <p>Created: {new Date(employee.created_at).toLocaleString()}</p>
              <p className="font-mono text-slate-500 truncate">ID: {employee.id}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Reset PIN Modal */}
      <Modal
        isOpen={showResetPinModal}
        onClose={() => {
          setShowResetPinModal(false);
          resetPinForm();
        }}
        title="Reset Employee PIN"
      >
        <form onSubmit={handleSubmitPin(onResetPin)} className="space-y-4">
          <p className="text-sm text-slate-400 mb-4">
            Enter a new 4-digit PIN for {employee.full_name}.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              New PIN
            </label>
            <Input
              {...registerPin('pin')}
              type="password"
              maxLength={4}
              placeholder="Enter 4 digits"
            />
            {pinErrors.pin && (
              <p className="text-red-400 text-xs mt-1">{pinErrors.pin.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Confirm PIN
            </label>
            <Input
              {...registerPin('confirmPin')}
              type="password"
              maxLength={4}
              placeholder="Confirm 4 digits"
            />
            {pinErrors.confirmPin && (
              <p className="text-red-400 text-xs mt-1">{pinErrors.confirmPin.message}</p>
            )}
          </div>

          {resetPinMutation.isError && (
            <p className="text-red-400 text-sm">Failed to reset PIN.</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowResetPinModal(false);
                resetPinForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={resetPinMutation.isPending}>
              {resetPinMutation.isPending ? 'Resetting...' : 'Reset PIN'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Modal */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Deactivate Employee"
      >
        <p className="text-slate-300 mb-6">
          Are you sure you want to deactivate <strong>{employee.full_name}</strong>?
          They will no longer be able to clock in or access the system.
        </p>

        {deactivateMutation.isError && (
          <p className="text-red-400 text-sm mb-4">Failed to deactivate employee.</p>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowDeactivateModal(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => deactivateMutation.mutate()}
            disabled={deactivateMutation.isPending}
          >
            {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
