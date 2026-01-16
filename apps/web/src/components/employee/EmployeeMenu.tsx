import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { routes } from '../../routes';

export default function EmployeeMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate(routes.employee.login);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
      >
        <span className="font-medium text-slate-100">
          {user?.initials || user?.name?.slice(0, 2).toUpperCase() || '??'}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="font-medium text-slate-100">{user?.name}</p>
            <p className="text-sm text-slate-400">{user?.initials}</p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(routes.employee.history);
              }}
              className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 transition-colors"
            >
              View Time History
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(routes.employee.changePin);
              }}
              className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Change PIN
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-700 py-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
