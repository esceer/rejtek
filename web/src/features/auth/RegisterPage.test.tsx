import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { RegisterPage } from './RegisterPage';

describe('RegisterPage', () => {
  it('validates the form before contacting the server', async () => {
    const register = vi.fn();
    renderWithProviders(<RegisterPage />, { register });

    await userEvent.type(screen.getByLabelText('Username'), 'a b');
    await userEvent.type(screen.getByLabelText('Master password'), 'short');
    await userEvent.type(screen.getByLabelText('Repeat master password'), 'different');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText(/3–32 characters/)).toBeInTheDocument();
    expect(screen.getByText('Use at least 10 characters.')).toBeInTheDocument();
    expect(screen.getByText('The passwords do not match.')).toBeInTheDocument();
    expect(screen.getByText('Please confirm you understand.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });
});
