import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CollectionChart from '../../src/components/CollectionChart';

const sampleData = [
  { label: 'Cash', value: 15000 },
  { label: 'GCash', value: 8000 },
  { label: 'BPI', value: 5000 },
];

describe('CollectionChart', () => {
  it('renders title when provided', () => {
    render(<CollectionChart data={sampleData} title="Daily Collections" />);

    expect(screen.getByText('Daily Collections')).toBeInTheDocument();
  });

  it('renders bar for each data item', () => {
    render(<CollectionChart data={sampleData} />);

    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('GCash')).toBeInTheDocument();
    expect(screen.getByText('BPI')).toBeInTheDocument();
  });

  it('renders values in PHP format', () => {
    render(<CollectionChart data={sampleData} />);

    expect(screen.getByText(/₱15,000/)).toBeInTheDocument();
    expect(screen.getByText(/₱8,000/)).toBeInTheDocument();
    expect(screen.getByText(/₱5,000/)).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<CollectionChart data={[]} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders labels for each item', () => {
    render(<CollectionChart data={sampleData} />);

    const labels = screen.getAllByText(/Cash|GCash|BPI/);
    expect(labels.length).toBe(3);
  });
});
