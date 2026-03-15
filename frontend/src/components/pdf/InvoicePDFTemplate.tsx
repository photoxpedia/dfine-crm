import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Invoice, PaymentSchedule, Project } from '@/types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
    paddingBottom: 20,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  statusBadge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusSent: {
    backgroundColor: '#dbeafe',
  },
  statusPaid: {
    backgroundColor: '#d1fae5',
  },
  statusOverdue: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  statusTextPending: {
    color: '#92400e',
  },
  statusTextSent: {
    color: '#1e40af',
  },
  statusTextPaid: {
    color: '#065f46',
  },
  statusTextOverdue: {
    color: '#991b1b',
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 40,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 4,
  },
  boxTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  boxContent: {
    fontSize: 10,
    lineHeight: 1.6,
  },
  detailsSection: {
    marginBottom: 30,
  },
  detailsTable: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  detailsHeaderText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#ffffff',
  },
  detailsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailsRowAlt: {
    backgroundColor: '#f9fafb',
  },
  colDescription: {
    flex: 3,
  },
  colAmount: {
    flex: 1,
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  descriptionSubtext: {
    fontSize: 9,
    color: '#6b7280',
  },
  summarySection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  summaryBox: {
    width: 280,
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#059669',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
  },
  dueDateSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateOverdue: {
    backgroundColor: '#fee2e2',
    borderLeftColor: '#ef4444',
  },
  dueDatePaid: {
    backgroundColor: '#d1fae5',
    borderLeftColor: '#10b981',
  },
  dueDateLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
  },
  dueDateLabelOverdue: {
    color: '#991b1b',
  },
  dueDateLabelPaid: {
    color: '#065f46',
  },
  dueDateValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
  },
  dueDateValueOverdue: {
    color: '#991b1b',
  },
  dueDateValuePaid: {
    color: '#065f46',
  },
  paymentSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  paymentTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  paymentText: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  notesSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  notesTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#0369a1',
  },
  notesText: {
    fontSize: 9,
    color: '#0c4a6e',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  thankYou: {
    marginTop: 40,
    textAlign: 'center',
  },
  thankYouText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  project?: Project;
  schedule?: PaymentSchedule;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
  };
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getMilestoneLabel = (milestone: string): string => {
  const labels: Record<string, string> = {
    contract_signing: 'Deposit - Contract Signing',
    project_start: 'Payment - Project Start',
    midpoint: 'Payment - Project Midpoint',
    completion: 'Final Payment - Project Completion',
  };
  return labels[milestone] || milestone;
};

export default function InvoicePDFTemplate({
  invoice,
  project,
  schedule,
  companyInfo = {
    name: 'ReModel Sync',
    address: '',
    phone: '',
    email: 'info@remodelsync.com',
    website: 'www.remodelsync.com',
  },
}: InvoicePDFProps) {
  const isOverdue = invoice.status === 'overdue';
  const isPaid = invoice.status === 'paid';

  const getStatusStyle = () => {
    switch (invoice.status) {
      case 'paid':
        return [styles.statusBadge, styles.statusPaid];
      case 'overdue':
        return [styles.statusBadge, styles.statusOverdue];
      case 'sent':
        return [styles.statusBadge, styles.statusSent];
      default:
        return [styles.statusBadge, styles.statusPending];
    }
  };

  const getStatusTextStyle = () => {
    switch (invoice.status) {
      case 'paid':
        return [styles.statusText, styles.statusTextPaid];
      case 'overdue':
        return [styles.statusText, styles.statusTextOverdue];
      case 'sent':
        return [styles.statusText, styles.statusTextSent];
      default:
        return [styles.statusText, styles.statusTextPending];
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text style={styles.companyDetails}>
              {companyInfo.address}
              {'\n'}
              {companyInfo.phone} | {companyInfo.email}
              {companyInfo.website && `\n${companyInfo.website}`}
            </Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
            <Text style={styles.invoiceNumber}>Date: {formatDate(invoice.createdAt)}</Text>
            <View style={getStatusStyle()}>
              <Text style={getStatusTextStyle()}>{invoice.status}</Text>
            </View>
          </View>
        </View>

        {/* Bill To & Project Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Text style={styles.boxTitle}>Bill To</Text>
            <Text style={styles.boxContent}>
              {project?.client?.name || 'Client Name'}
              {project?.client?.email && `\n${project.client.email}`}
              {project?.client?.phone && `\n${project.client.phone}`}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.boxTitle}>Project</Text>
            <Text style={styles.boxContent}>
              {project?.name || 'Project Name'}
              {project?.address && `\n${project.address}`}
              {(project?.city || project?.state || project?.zip) &&
                `\n${[project?.city, project?.state, project?.zip].filter(Boolean).join(', ')}`}
            </Text>
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailsTable}>
            <View style={styles.detailsHeader}>
              <Text style={[styles.detailsHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.detailsHeaderText, styles.colAmount]}>Amount</Text>
            </View>
            <View style={styles.detailsRow}>
              <View style={styles.colDescription}>
                <Text style={styles.descriptionText}>
                  {schedule ? getMilestoneLabel(schedule.milestone) : 'Payment'}
                </Text>
                <Text style={styles.descriptionSubtext}>
                  {schedule
                    ? `${schedule.percentage}% of total project value`
                    : 'Payment for services rendered'}
                </Text>
              </View>
              <Text style={[styles.colAmount, { fontFamily: 'Helvetica-Bold', fontSize: 11 }]}>
                {formatCurrency(invoice.amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoice.amount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Due:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.amount)}</Text>
            </View>
          </View>
        </View>

        {/* Due Date */}
        {invoice.dueDate && (
          <View
            style={[
              styles.dueDateSection,
              isOverdue ? styles.dueDateOverdue : {},
              isPaid ? styles.dueDatePaid : {},
            ]}
          >
            <Text
              style={[
                styles.dueDateLabel,
                isOverdue ? styles.dueDateLabelOverdue : {},
                isPaid ? styles.dueDateLabelPaid : {},
              ]}
            >
              {isPaid ? 'PAID ON' : isOverdue ? 'OVERDUE - WAS DUE' : 'PAYMENT DUE BY'}
            </Text>
            <Text
              style={[
                styles.dueDateValue,
                isOverdue ? styles.dueDateValueOverdue : {},
                isPaid ? styles.dueDateValuePaid : {},
              ]}
            >
              {isPaid && invoice.paidAt
                ? formatDate(invoice.paidAt)
                : formatDate(invoice.dueDate)}
            </Text>
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Payment Instructions */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Methods</Text>
          <Text style={styles.paymentText}>
            We accept the following payment methods:
          </Text>
          <Text style={styles.paymentText}>
            - Check: Make payable to "{companyInfo.name}"
          </Text>
          <Text style={styles.paymentText}>
            - Credit Card: Contact us for secure payment link
          </Text>
          <Text style={styles.paymentText}>
            - Bank Transfer: Contact us for wire transfer details
          </Text>
        </View>

        {/* Thank You */}
        <View style={styles.thankYou}>
          <Text style={styles.thankYouText}>Thank you for your business!</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{companyInfo.name}</Text>
          <Text style={styles.footerText}>Invoice #{invoice.invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
