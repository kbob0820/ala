import React from 'react';

interface CollectionChartProps {
  data: Array<{ label: string; value: number }>;
  title?: string;
  height?: number;
  color?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value);
};

const CollectionChart: React.FC<CollectionChartProps> = ({
  data,
  title,
  height = 300,
  color = 'primary',
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center text-muted py-5">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {title && (
        <div className="card-header">
          <h6 className="mb-0">{title}</h6>
        </div>
      )}
      <div className="card-body" style={{ minHeight: height }}>
        {data.map((item, index) => (
          <div key={index} className="d-flex align-items-center mb-2">
            <div className="small text-end me-2" style={{ width: '120px', flexShrink: 0 }}>
              {item.label}
            </div>
            <div className="flex-grow-1">
              <div
                className={`bg-${color}`}
                style={{
                  height: '24px',
                  width: `${(item.value / maxValue) * 100}%`,
                  minWidth: '4px',
                  borderRadius: '3px',
                }}
              />
            </div>
            <div className="small ms-2" style={{ width: '120px', flexShrink: 0 }}>
              {formatCurrency(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionChart;
