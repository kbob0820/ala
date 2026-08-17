import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('App', () => {
  it('renders the login page by default', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(await screen.findByText('AJang Loan')).toBeDefined();
  });
});
