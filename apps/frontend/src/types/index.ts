export interface User {
  id: number;
  name: string;
  email: string;
  role?: Role | null;
  role_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_documents'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LoanStatus =
  | 'waiting_for_release'
  | 'released'
  | 'active'
  | 'past_due'
  | 'delinquent'
  | 'restructured'
  | 'settled_by_reloan'
  | 'fully_paid'
  | 'closed'
  | 'defaulted';

export type InstallmentStatus =
  | 'pending'
  | 'due'
  | 'partially_paid'
  | 'paid'
  | 'past_due'
  | 'cancelled'
  | 'waived';

export type CollectionStatus =
  | 'reminder_sent'
  | 'promise_to_pay'
  | 'under_collection'
  | 'legal_action'
  | 'settled';

export interface Client {
  id: number;
  name: string;
  address: string | null;
  work: string | null;
  work_address: string | null;
  contact_number: string | null;
  social_media: Record<string, string> | null;
  notes: string | null;
  photo: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ClientStatus = 'active' | 'inactive' | 'all';

export interface AddressFields {
  present_address: string;
  permanent_address: string;
}

export interface EmploymentInfo {
  occupation: string;
  employer: string;
  employer_address: string;
  years_employed: number | null;
  monthly_income: number | null;
}

export interface Beneficiary {
  name: string;
  relationship: string;
  contact_number: string;
}

export interface ClientListItem extends Client {
  loans_count: number;
  loans_by_status: string;
}

export interface ClientFilters {
  search?: string;
  status?: ClientStatus;
  per_page?: number;
  page?: number;
}

export interface Document {
  id: number;
  documentable_type: string;
  documentable_id: number;
  type: string;
  file_path: string;
  original_name: string;
  ocr_verified: boolean;
  ocr_data: Record<string, unknown> | null;
  view_url: string;
  created_at: string;
  updated_at: string;
}

export interface LoanInstallment {
  id: number;
  loan_id: number;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  waived_amount: number;
  status: InstallmentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  charges?: LoanCharge[];
}

export type ChargeType = 'LATE_FEE' | 'TRANSFER_FEE' | 'OTHER_CHARGE';

export type ChargeStatus =
  | 'ASSESSED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'WAIVED'
  | 'REVERSED';

export interface LoanCharge {
  id: number;
  loan_id: number;
  loan_installment_id: number | null;
  client_id: number;
  charge_type: ChargeType;
  description: string | null;
  original_amount: number;
  paid_amount: number;
  waived_amount: number;
  balance: number;
  requested_waive_amount: number | null;
  assessment_date: string;
  due_date: string | null;
  status: ChargeStatus;
  reference: string;
  reason: string | null;
  requested_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  reversed_by: number | null;
  reversed_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: number;
  payment_id: number;
  loan_id: number;
  charge_id: number | null;
  installment_id: number | null;
  amount: number;
  allocation_type: 'LATE_FEE' | 'OTHER_CHARGE' | 'PAST_DUE' | 'CURRENT';
  status: 'applied' | 'reversed';
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  loan_id: number;
  client_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  proof_image: string | null;
  proof_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanSettlement {
  id: number;
  reloan_loan_id: number;
  old_loan_id: number;
  settlement_amount: number;
  principal_amount: number;
  charge_amount: number;
  settlement_date: string | null;
  status: string;
  payment_id: number | null;
  created_by: number;
  approved_by: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  reloan_loan?: Loan;
}

export interface LoanReleaseSource {
  id: number;
  loan_id: number;
  release_method: string;
  amount: number;
  fee: number;
  proof_image: string | null;
  proof_image_url: string | null;
  notes: string | null;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: number;
  client_id: number;
  parent_loan_id: number | null;
  loan_type: string;
  loan_number: string | null;
  created_by: number | null;
  approved_by: number | null;
  term_months: number | null;
  interest_rate_per_month: number;
  charges: number;
  charges_description: string | null;
  old_balance_settlement: number;
  total_deductions: number;
  guarantor: string | null;
  first_payment_due_date: string | null;
  application_status: ApplicationStatus;
  loan_status: LoanStatus | null;
  collection_status: CollectionStatus | null;
  amount: number;
  total_interest: number;
  net_proceeds: number;
  installment_amount: number;
  total_installments: number;
  approved_at: string | null;
  released_at: string | null;
  closed_at: string | null;
  remaining_balance?: number;
  total_outstanding?: number;
  unpaid_installments_count?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  client?: Client;
  installments?: LoanInstallment[];
  payments?: Payment[];
  charges?: LoanCharge[];
  release_sources?: LoanReleaseSource[];
  created_by_user?: User;
  approved_by_user?: User;
  documents?: Document[];
  parent_loan?: Loan;
  settlements_as_old_loan?: LoanSettlement[];
  settlements_as_reloan?: LoanSettlement[];
}

export interface InstallmentScheduleItem {
  installment_number: number;
  due_date: string;
  amount: number;
}

export interface ExistingLoanInfo {
  id: number;
  amount: number;
  remaining_balance: number;
  loan_status: LoanStatus;
  term_months: number;
}

export interface LoanCalculation {
  amount: number;
  term_months: number;
  interest_rate_per_month: number;
  total_interest: number;
  net_proceeds: number;
  total_installments: number;
  installment_amount: number;
  schedule: InstallmentScheduleItem[];
  existing_loans?: ExistingLoanInfo[];
  total_existing_balance?: number;
  net_proceeds_after_deduction?: number;
  total_exposure?: number;
}

export interface PaymentType {
  id: number;
  name: string;
  category: 'payment_method' | 'release_method';
  is_active: boolean;
  fee: number | null;
  created_at: string;
  updated_at: string;
}

export interface OverdueInstallment {
  id: number;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  waived_amount?: number;
  past_due_amount: number;
  days_overdue: number;
  late_fees: number;
  late_fee_editable?: boolean;
  status: InstallmentStatus;
}

export interface PastDueLoan {
  id: number;
  client: {
    id: number;
    name: string;
    contact_number: string | null;
  };
  loan_number?: string | null;
  amount: number;
  loan_status: LoanStatus;
  collection_status: CollectionStatus | null;
  overdue_installments: OverdueInstallment[];
  max_days_overdue?: number;
  late_fees?: number;
  total_outstanding?: number;
  risk_level?: string;
  remaining_balance?: number;
}

export interface OutstandingBreakdown {
  loan_id: number;
  loan_number: string | null;
  amount: number;
  remaining_balance: number;
  past_due_amount: number;
  late_fees: number;
  other_charges: number;
  total_outstanding: number;
}

export interface LoanSettings {
  late_fee_amount: number;
  late_fee_grace_days: number;
}

export interface DashboardSummary {
  total_clients: number;
  active_loans: number;
  pending_applications: number;
  completed_loans: number;
  defaulted_loans: number;
  total_collections: number;
  total_expected_repayments: number;
  due_installments: number;
  overdue_installments: number;
  total_late_fees: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  recent_loans: Loan[];
  upcoming_due: {
    installment_id: number;
    loan_id: number;
    client_name: string;
    installment_number: number;
    due_date: string;
    amount: number;
  }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  message?: string;
  error?: {
    message: string;
    code: string;
    details?: Record<string, string[]>;
  };
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    message: string;
    code: string;
    details?: Record<string, string[]>;
  };
}

export const DEFAULT_INTEREST_RATE = '10';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  pending_documents: 'Pending Documents',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  waiting_for_release: 'Awaiting Release',
  released: 'Released',
  active: 'Active',
  past_due: 'Past Due',
  delinquent: 'Delinquent',
  restructured: 'Restructured',
  settled_by_reloan: 'Settled by Reloan',
  fully_paid: 'Fully Paid',
  closed: 'Closed',
  defaulted: 'Defaulted',
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Upcoming',
  due: 'Due',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  past_due: 'Past Due',
  cancelled: 'Cancelled',
  waived: 'Waived',
};

export const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  LATE_FEE: 'Late Fee',
  TRANSFER_FEE: 'Transfer Fee',
  OTHER_CHARGE: 'Other Charge',
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  ASSESSED: 'Assessed',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  WAIVED: 'Waived',
  REVERSED: 'Reversed',
};

export const COLLECTION_STATUS_LABELS: Record<CollectionStatus, string> = {
  reminder_sent: 'Reminder Sent',
  promise_to_pay: 'Promise to Pay',
  under_collection: 'Under Collection',
  legal_action: 'Legal Action',
  settled: 'Settled',
};

export const DOCUMENT_TYPES = [
  'govt_id',
  'payslip',
  'coe',
  'billing',
  'bank',
  'company_contract',
  'company_id',
  'other',
] as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  govt_id: 'Government ID',
  payslip: 'Payslip',
  coe: 'Certificate of Employment',
  billing: 'Billing Statement',
  bank: 'Bank Statement',
  company_contract: 'Company Contract',
  company_id: 'Company ID',
  other: 'Other',
};

export type RefundStatus =
  | 'requested'
  | 'verified'
  | 'approved'
  | 'released'
  | 'completed'
  | 'rejected';

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  requested: 'Requested',
  verified: 'Verified',
  approved: 'Approved',
  released: 'Released',
  completed: 'Completed',
  rejected: 'Rejected',
};

export interface Refund {
  id: number;
  loan_id: number;
  client_id: number;
  amount: number;
  reason: string;
  status: RefundStatus;
  verified_by: number | null;
  approved_by: number | null;
  released_by: number | null;
  verified_at: string | null;
  approved_at: string | null;
  released_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  notes: string | null;
  release_method: string | null;
  created_at: string;
  updated_at: string;
  loan?: Loan;
  client?: Client;
}

export interface OverpaymentInfo {
  loanId: number;
  loanNumber?: string | null;
  clientId: number;
  clientName: string;
  loanAmount: number;
  totalPaid: number;
  lateFees: number;
  overpayment: number;
  loanStatus: string;
}

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  all: 'All',
};
