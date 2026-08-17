import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import { ClientListPage } from '@/pages/ClientListPage';
import { ClientCreatePage } from '@/pages/ClientCreatePage';
import { ClientEditPage } from '@/pages/ClientEditPage';
import { ClientDetailPage } from '@/pages/ClientDetailPage';
import LoanApplyPage from '@/pages/LoanApplyPage';
import { LoanDetailPage } from '@/pages/LoanDetailPage';
import LoanEditPage from '@/pages/LoanEditPage';
import { LoanListPage } from '@/pages/LoanListPage';
import LoanApprovalPage from '@/pages/LoanApprovalPage';
import LoanCalculatorPage from '@/pages/LoanCalculatorPage';
import { PastDuePage } from '@/pages/PastDuePage';
import ReportsPage from '@/pages/ReportsPage';
import { PaymentListPage } from '@/pages/PaymentListPage';
import { ReceivePaymentPage } from '@/pages/ReceivePaymentPage';
import { PaymentReceiptPage } from '@/pages/PaymentReceiptPage';
import { UserListPage } from '@/pages/UserListPage';
import ReloanDashboardPage from '@/pages/ReloanDashboardPage';
import { RefundDashboardPage } from '@/pages/RefundDashboardPage';
import { RefundRequestPage } from '@/pages/RefundRequestPage';
import RefundDetailPage from '@/pages/RefundDetailPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UserListPage />} />
            <Route path="clients" element={<ClientListPage />} />
            <Route path="clients/new" element={<ClientCreatePage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="clients/:id/edit" element={<ClientEditPage />} />
            <Route path="loans/calculator" element={<LoanCalculatorPage />} />
            <Route path="loans/new/:clientId" element={<LoanApplyPage />} />
            <Route path="loans/approve" element={<LoanApprovalPage />} />
            <Route path="loans" element={<LoanListPage />} />
            <Route path="loans/:id/edit" element={<LoanEditPage />} />
            <Route path="loans/:id" element={<LoanDetailPage />} />
            <Route path="past-due" element={<PastDuePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="payments" element={<PaymentListPage />} />
            <Route path="payments/receive/:loanId" element={<ReceivePaymentPage />} />
            <Route path="payments/receipt/:loanId/:paymentId" element={<PaymentReceiptPage />} />
            <Route path="reloan" element={<ReloanDashboardPage />} />
            <Route path="reloan/calculate/:clientId" element={<LoanCalculatorPage />} />
            <Route path="refunds" element={<RefundDashboardPage />} />
            <Route path="refunds/request/:loanId" element={<RefundRequestPage />} />
            <Route path="refunds/:refundId" element={<RefundDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
