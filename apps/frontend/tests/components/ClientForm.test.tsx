import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ClientForm } from '../../src/components/ClientForm';

const defaultProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  submitLabel: 'Save Client',
  loading: false,
  generalError: null,
  fieldErrors: {},
};

afterEach(() => {
  cleanup();
});

describe('ClientForm', () => {
  it('renders all form sections', () => {
    render(<ClientForm {...defaultProps} />);

    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Address Information')).toBeInTheDocument();
    expect(screen.getByText('Employment Information')).toBeInTheDocument();
    expect(screen.getByText('Social Media & Notes')).toBeInTheDocument();
  });

  it('renders name input as required', () => {
    render(<ClientForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Full Name/);
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeRequired();
  });

  it('renders photo upload area', () => {
    render(<ClientForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('shows submit button with custom label', () => {
    render(<ClientForm {...defaultProps} submitLabel="Update Client" />);

    const submitButton = screen.getByText('Update Client');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('shows cancel button', () => {
    render(<ClientForm {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveAttribute('type', 'button');
  });

  it('renders general error when provided', () => {
    render(<ClientForm {...defaultProps} generalError="Request failed. Please try again." />);

    expect(screen.getByText('Request failed. Please try again.')).toBeInTheDocument();
  });
});
