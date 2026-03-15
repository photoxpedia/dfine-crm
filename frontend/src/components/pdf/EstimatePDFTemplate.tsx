import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Estimate, EstimateSection, EstimateLineItem } from '@/types';

// Register fonts (optional - using default for now)
// Font.register({ family: 'Inter', src: '/fonts/Inter.ttf' });

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
    borderBottomColor: '#7c3aed',
    paddingBottom: 20,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  estimateInfo: {
    textAlign: 'right',
  },
  estimateTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  estimateNumber: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  clientSection: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 40,
  },
  clientBox: {
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    backgroundColor: '#7c3aed',
    padding: 8,
    marginBottom: 1,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#ffffff',
  },
  sectionTotal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#ffffff',
    width: 100,
    textAlign: 'right',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colDescription: {
    flex: 3,
  },
  colQty: {
    width: 50,
    textAlign: 'center',
  },
  colUnit: {
    width: 40,
    textAlign: 'center',
  },
  colPrice: {
    width: 80,
    textAlign: 'right',
  },
  colTotal: {
    width: 100,
    textAlign: 'right',
  },
  itemName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 9,
    color: '#6b7280',
  },
  summarySection: {
    marginTop: 30,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  summaryLabel: {
    width: 150,
    textAlign: 'right',
    fontSize: 10,
    color: '#6b7280',
    paddingRight: 20,
  },
  summaryValue: {
    width: 120,
    textAlign: 'right',
    fontSize: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#7c3aed',
  },
  totalLabel: {
    width: 150,
    textAlign: 'right',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    paddingRight: 20,
  },
  totalValue: {
    width: 120,
    textAlign: 'right',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
  },
  termsSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  termsTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  termsText: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: 6,
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
  signatureSection: {
    marginTop: 60,
    flexDirection: 'row',
    gap: 40,
  },
  signatureBox: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    marginBottom: 8,
    height: 40,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  notesSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fefce8',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#eab308',
  },
  notesTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#854d0e',
  },
  notesText: {
    fontSize: 9,
    color: '#713f12',
    lineHeight: 1.5,
  },
});

interface EstimatePDFProps {
  estimate: Estimate;
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

export default function EstimatePDFTemplate({
  estimate,
  companyInfo = {
    name: 'ReModel Sync',
    address: '',
    phone: '',
    email: 'info@remodelsync.com',
    website: 'www.remodelsync.com',
  },
}: EstimatePDFProps) {
  const project = estimate.project;
  const sections = estimate.sections || [];

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
          <View style={styles.estimateInfo}>
            <Text style={styles.estimateTitle}>ESTIMATE</Text>
            <Text style={styles.estimateNumber}>#{estimate.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.estimateNumber}>Version {estimate.version}</Text>
            <Text style={styles.estimateNumber}>Date: {formatDate(estimate.createdAt)}</Text>
            {estimate.validUntil && (
              <Text style={styles.estimateNumber}>Valid Until: {formatDate(estimate.validUntil)}</Text>
            )}
          </View>
        </View>

        {/* Client & Project Info */}
        <View style={styles.clientSection}>
          <View style={styles.clientBox}>
            <Text style={styles.boxTitle}>Client</Text>
            <Text style={styles.boxContent}>
              {project?.client?.name || 'Client Name'}
              {project?.client?.email && `\n${project.client.email}`}
              {project?.client?.phone && `\n${project.client.phone}`}
            </Text>
          </View>
          <View style={styles.clientBox}>
            <Text style={styles.boxTitle}>Project Location</Text>
            <Text style={styles.boxContent}>
              {project?.name || 'Project Name'}
              {project?.address && `\n${project.address}`}
              {(project?.city || project?.state || project?.zip) &&
                `\n${[project?.city, project?.state, project?.zip].filter(Boolean).join(', ')}`}
            </Text>
          </View>
        </View>

        {/* Line Items by Section */}
        {sections.map((section: EstimateSection) => (
          <View key={section.id} style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.name}</Text>
              <Text style={styles.sectionTotal}>{formatCurrency(section.subtotalSelling)}</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>
            {(section.lineItems || []).map((item: EstimateLineItem, itemIndex: number) => (
              <View
                key={item.id}
                style={[styles.tableRow, itemIndex % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <View style={styles.colDescription}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  )}
                </View>
                <Text style={[styles.colQty, { fontSize: 10 }]}>{item.quantity}</Text>
                <Text style={[styles.colUnit, { fontSize: 10 }]}>{item.unitOfMeasure}</Text>
                <Text style={[styles.colPrice, { fontSize: 10 }]}>
                  {formatCurrency(item.sellingPrice)}
                </Text>
                <Text style={[styles.colTotal, { fontSize: 10, fontFamily: 'Helvetica-Bold' }]}>
                  {formatCurrency(item.totalSelling)}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(estimate.subtotalSelling)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {estimate.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{estimate.notes}</Text>
          </View>
        )}

        {/* Terms & Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            1. This estimate is valid for 30 days from the date shown above.
          </Text>
          <Text style={styles.termsText}>
            2. Payment schedule: 30% deposit upon signing, 30% at project start, 30% at midpoint, 10% upon completion.
          </Text>
          <Text style={styles.termsText}>
            3. Any changes to the scope of work may result in additional charges.
          </Text>
          <Text style={styles.termsText}>
            4. All work is guaranteed for one year from completion date.
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Client Signature & Date</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Company Representative & Date</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{companyInfo.name}</Text>
          <Text style={styles.footerText}>
            Page <Text render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`} />
          </Text>
        </View>
      </Page>
    </Document>
  );
}
