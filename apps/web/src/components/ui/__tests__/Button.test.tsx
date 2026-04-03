import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('does not fire click when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('variants', () => {
    it('renders default variant with primary classes', () => {
      render(<Button>Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary');
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-secondary');
    });

    it('renders ghost variant without background', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('bg-primary');
      expect(button).not.toHaveClass('bg-secondary');
    });

    it('renders destructive variant', () => {
      render(<Button variant="destructive">Danger</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-destructive');
    });
  });

  describe('sizes', () => {
    it('renders default size', () => {
      render(<Button>Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-9', 'px-4');
    });

    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-8', 'px-3');
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10', 'px-8');
    });
  });

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('passes through other HTML button attributes', () => {
    render(<Button type="submit" data-testid="submit-btn">Submit</Button>);

    const button = screen.getByTestId('submit-btn');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
