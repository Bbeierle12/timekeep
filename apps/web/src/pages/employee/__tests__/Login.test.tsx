import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import EmployeeLogin from '../Login';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('EmployeeLogin', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the login form', () => {
    render(<EmployeeLogin />);

    expect(screen.getByRole('heading', { name: /timekeep/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('JD')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('****')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  it('has a link to admin login', async () => {
    const user = userEvent.setup();
    render(<EmployeeLogin />);

    const adminButton = screen.getByRole('button', { name: /admin login/i });
    await user.click(adminButton);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
  });

  it('shows forgot PIN help text', () => {
    render(<EmployeeLogin />);

    expect(screen.getByText(/forgot pin/i)).toBeInTheDocument();
    expect(screen.getByText(/contact your administrator/i)).toBeInTheDocument();
  });
});
