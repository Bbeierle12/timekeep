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
    expect(screen.getByLabelText(/initials/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pin/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<EmployeeLogin />);

    await user.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText(/initials must be 2-3 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for short initials', async () => {
    const user = userEvent.setup();
    render(<EmployeeLogin />);

    await user.type(screen.getByLabelText(/initials/i), 'J');
    await user.type(screen.getByLabelText(/pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText(/initials must be 2-3 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for short PIN', async () => {
    const user = userEvent.setup();
    render(<EmployeeLogin />);

    await user.type(screen.getByLabelText(/initials/i), 'JD');
    await user.type(screen.getByLabelText(/pin/i), '123');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText(/pin must be at least 4 digits/i)).toBeInTheDocument();
    });
  });

  it('converts initials to uppercase', async () => {
    const user = userEvent.setup();
    render(<EmployeeLogin />);

    const initialsInput = screen.getByLabelText(/initials/i);
    await user.type(initialsInput, 'jd');

    expect(initialsInput).toHaveValue('JD');
  });

  it.skip('submits with valid credentials', async () => {
    const user = userEvent.setup();
    render(<EmployeeLogin />);

    await user.type(screen.getByLabelText(/initials/i), 'JD');
    await user.type(screen.getByLabelText(/pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    // Should navigate to dashboard on success
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/employee/dashboard');
    }, { timeout: 5000 });
  });

  it('shows error message on invalid credentials', async () => {
    const user = userEvent.setup();
    render(<EmployeeLogin />);

    await user.type(screen.getByLabelText(/initials/i), 'XX');
    await user.type(screen.getByLabelText(/pin/i), '0000');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid initials or pin/i)).toBeInTheDocument();
    }, { timeout: 5000 });
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
