import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius_meters: z.coerce.number().min(10).max(10000),
});

type LocationFormData = z.infer<typeof locationSchema>;

type Location = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
};

type GeofenceSettingsProps = {
  enabled: boolean;
  mode: 'warn' | 'block' | 'log';
  locations: Location[];
  onToggle: (enabled: boolean) => void;
  onModeChange: (mode: 'warn' | 'block' | 'log') => void;
  onAddLocation: (location: Omit<Location, 'id' | 'is_active'>) => Promise<void>;
  onUpdateLocation: (id: string, location: Partial<Location>) => Promise<void>;
  onDeleteLocation: (id: string) => Promise<void>;
};

export default function GeofenceSettings({
  enabled,
  mode,
  locations,
  onToggle,
  onModeChange,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
}: GeofenceSettingsProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema as any),
    defaultValues: editingLocation ?? undefined,
  });

  const openAddModal = () => {
    reset({
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      radius_meters: 100,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (location: Location) => {
    reset(location);
    setEditingLocation(location);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setEditingLocation(null);
    reset();
  };

  const onSubmit = async (data: LocationFormData) => {
    setIsSubmitting(true);
    try {
      if (editingLocation) {
        await onUpdateLocation(editingLocation.id, data);
      } else {
        await onAddLocation(data);
      }
      closeModals();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      await onDeleteLocation(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
        <div>
          <h3 className="font-medium text-slate-100">Geofencing</h3>
          <p className="text-sm text-slate-400">
            Require employees to be at approved locations when clocking in/out
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
        </label>
      </div>

      {enabled && (
        <>
          {/* Mode Selection */}
          <div className="p-4 bg-slate-800 rounded-lg">
            <h4 className="font-medium text-slate-100 mb-3">Enforcement Mode</h4>
            <div className="space-y-2">
              {[
                { value: 'log' as const, label: 'Log Only', description: 'Record location but allow all punches' },
                { value: 'warn' as const, label: 'Warn', description: 'Show warning but allow employees to proceed' },
                { value: 'block' as const, label: 'Block', description: 'Prevent punches outside approved areas' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 rounded-lg cursor-pointer transition-colors ${
                    mode === option.value ? 'bg-sky-500/20 border border-sky-500/50' : 'bg-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="geofence-mode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={() => onModeChange(option.value)}
                    className="mt-1 h-4 w-4 text-sky-500 focus:ring-sky-500 focus:ring-offset-0 bg-slate-900 border-slate-600"
                  />
                  <div className="ml-3">
                    <span className="block font-medium text-slate-100">{option.label}</span>
                    <span className="block text-sm text-slate-400">{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Locations List */}
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-100">Approved Locations</h4>
              <Button size="sm" onClick={openAddModal}>
                Add Location
              </Button>
            </div>

            {locations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No locations configured. Add at least one approved work location.
              </p>
            ) : (
              <div className="space-y-2">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      location.is_active ? 'bg-slate-700/50' : 'bg-slate-700/30 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-100">{location.name}</span>
                        {!location.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-slate-600 rounded text-slate-300">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{location.address}</p>
                      <p className="text-xs text-slate-500">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} ({location.radius_meters}m radius)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditModal(location)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(location.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Location Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingLocation}
        onClose={closeModals}
        title={editingLocation ? 'Edit Location' : 'Add Location'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Location Name"
            placeholder="Main Office"
            {...register('name')}
            error={errors.name?.message}
          />

          <Input
            label="Address"
            placeholder="123 Main St, City, State ZIP"
            {...register('address')}
            error={errors.address?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="any"
              placeholder="37.7749"
              {...register('latitude')}
              error={errors.latitude?.message}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              placeholder="-122.4194"
              {...register('longitude')}
              error={errors.longitude?.message}
            />
          </div>

          <Input
            label="Radius (meters)"
            type="number"
            min={10}
            max={10000}
            placeholder="100"
            {...register('radius_meters')}
            error={errors.radius_meters?.message}
          />

          <p className="text-xs text-slate-500">
            Tip: You can find coordinates by right-clicking on Google Maps and selecting the coordinates.
          </p>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModals}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingLocation ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
