import {
  APPLICATION_STATUS_LABELS,
  LOAN_STATUS_LABELS,
  INSTALLMENT_STATUS_LABELS,
  COLLECTION_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from '@/types';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  approved: { bg: 'var(--ala-success-50)', text: 'var(--ala-success-600)', dot: 'var(--ala-success-600)' },
  active: { bg: 'var(--ala-success-50)', text: 'var(--ala-success-600)', dot: 'var(--ala-success-600)' },
  paid: { bg: 'var(--ala-success-50)', text: 'var(--ala-success-600)', dot: 'var(--ala-success-600)' },
  settled: { bg: 'var(--ala-success-50)', text: 'var(--ala-success-600)', dot: 'var(--ala-success-600)' },
  fully_paid: { bg: 'var(--ala-success-50)', text: 'var(--ala-success-600)', dot: 'var(--ala-success-600)' },
  completed: { bg: 'var(--ala-success-50)', text: 'var(--ala-success-600)', dot: 'var(--ala-success-600)' },

  rejected: { bg: 'var(--ala-danger-50)', text: 'var(--ala-danger-600)', dot: 'var(--ala-danger-600)' },
  past_due: { bg: 'var(--ala-danger-50)', text: 'var(--ala-danger-600)', dot: 'var(--ala-danger-600)' },
  delinquent: { bg: 'var(--ala-danger-50)', text: 'var(--ala-danger-600)', dot: 'var(--ala-danger-600)' },
  overdue: { bg: 'var(--ala-danger-50)', text: 'var(--ala-danger-600)', dot: 'var(--ala-danger-600)' },
  cancelled: { bg: 'var(--ala-danger-50)', text: 'var(--ala-danger-600)', dot: 'var(--ala-danger-600)' },
  defaulted: { bg: 'var(--ala-danger-50)', text: 'var(--ala-danger-600)', dot: 'var(--ala-danger-600)' },
  under_collection: { bg: 'var(--ala-danger-50)', text: 'var(--ala-danger-600)', dot: 'var(--ala-danger-600)' },
  legal_action: { bg: 'var(--ala-danger-50)', text: 'var(--ala-danger-600)', dot: 'var(--ala-danger-600)' },
  missed: { bg: 'var(--ala-danger-50)', text: 'var(--ala-danger-600)', dot: 'var(--ala-danger-600)' },

  under_review: { bg: 'var(--ala-warning-50)', text: 'var(--ala-warning-600)', dot: 'var(--ala-warning-600)' },
  pending_documents: { bg: 'var(--ala-warning-50)', text: 'var(--ala-warning-600)', dot: 'var(--ala-warning-600)' },
  submitted: { bg: 'var(--ala-warning-50)', text: 'var(--ala-warning-600)', dot: 'var(--ala-warning-600)' },
  waiting_for_release: { bg: 'var(--ala-warning-50)', text: 'var(--ala-warning-600)', dot: 'var(--ala-warning-600)' },
  due: { bg: 'var(--ala-warning-50)', text: 'var(--ala-warning-600)', dot: 'var(--ala-warning-600)' },
  verified: { bg: 'var(--ala-warning-50)', text: 'var(--ala-warning-600)', dot: 'var(--ala-warning-600)' },
  restructured: { bg: 'var(--ala-warning-50)', text: 'var(--ala-warning-600)', dot: 'var(--ala-warning-600)' },
  promise_to_pay: { bg: 'var(--ala-warning-50)', text: 'var(--ala-warning-600)', dot: 'var(--ala-warning-600)' },
  partially_paid: { bg: 'var(--ala-warning-50)', text: 'var(--ala-warning-600)', dot: 'var(--ala-warning-600)' },

  settled_by_reloan: { bg: 'var(--ala-blue-50)', text: 'var(--ala-blue-700)', dot: 'var(--ala-blue-700)' },
  released: { bg: 'var(--ala-blue-50)', text: 'var(--ala-blue-700)', dot: 'var(--ala-blue-700)' },
  reminder_sent: { bg: 'var(--ala-blue-50)', text: 'var(--ala-blue-700)', dot: 'var(--ala-blue-700)' },
  requested: { bg: 'var(--ala-blue-50)', text: 'var(--ala-blue-700)', dot: 'var(--ala-blue-700)' },

  draft: { bg: 'var(--ala-gray-100)', text: 'var(--ala-gray-600)', dot: 'var(--ala-gray-500)' },
  pending: { bg: 'var(--ala-gray-100)', text: 'var(--ala-gray-600)', dot: 'var(--ala-gray-500)' },
  closed: { bg: 'var(--ala-gray-100)', text: 'var(--ala-gray-600)', dot: 'var(--ala-gray-500)' },
};

const DEFAULT_COLORS = { bg: 'var(--ala-gray-100)', text: 'var(--ala-gray-600)', dot: 'var(--ala-gray-500)' };

function getLabel(status: string): string {
  return (
    APPLICATION_STATUS_LABELS[status as ApplicationStatus] ??
    LOAN_STATUS_LABELS[status as LoanStatus] ??
    INSTALLMENT_STATUS_LABELS[status as InstallmentStatus] ??
    COLLECTION_STATUS_LABELS[status as CollectionStatus] ??
    REFUND_STATUS_LABELS[status as RefundStatus] ??
    status
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? DEFAULT_COLORS;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.1875rem 0.5625rem',
        borderRadius: '9999px',
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: 'var(--ala-text-xs)',
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: colors.dot,
          flexShrink: 0,
        }}
      />
      {getLabel(status)}
    </span>
  );
}
