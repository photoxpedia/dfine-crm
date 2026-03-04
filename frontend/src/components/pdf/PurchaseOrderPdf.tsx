import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#6d28d9',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#6d28d9',
  },
  companySubtext: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  poTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
    textAlign: 'right',
  },
  poNumber: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
    marginTop: 2,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  infoBlock: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 10,
    color: '#333',
    marginBottom: 2,
  },
  infoTextBold: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f0ff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd5f5',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: '#fafafa',
  },
  colName: { width: '40%' },
  colQty: { width: '15%', textAlign: 'center' },
  colUnit: { width: '20%', textAlign: 'right' },
  colTotal: { width: '25%', textAlign: 'right' },
  headerText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6d28d9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 10,
    color: '#333',
  },
  cellTextBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  totalsBlock: {
    width: '45%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  totalsFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: '#6d28d9',
    marginTop: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: '#666',
  },
  totalsValue: {
    fontSize: 10,
    color: '#333',
  },
  totalsFinalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  totalsFinalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#6d28d9',
  },
  notesSection: {
    marginTop: 30,
    padding: 12,
    backgroundColor: '#fafafa',
    borderLeftWidth: 3,
    borderLeftColor: '#6d28d9',
  },
  notesLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 10,
    color: '#333',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  statusBadge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6d28d9',
    textTransform: 'uppercase',
    textAlign: 'right',
    marginTop: 4,
  },
});

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PurchaseOrderPdfProps {
  po: {
    poNumber: string;
    status: string;
    createdAt: string;
    subtotal: number | string;
    tax: number | string;
    shipping: number | string;
    total: number | string;
    notes?: string | null;
    project?: { name: string } | null;
    vendor?: {
      name: string;
      contactName?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
    } | null;
    items?: Array<{
      id: string;
      quantityOrdered: number | string;
      unitCost: number | string;
      totalCost: number | string;
      materialItem?: {
        name: string;
        description?: string | null;
      } | null;
    }>;
  };
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

export default function PurchaseOrderPdf({
  po,
  companyName = 'Your Company',
  companyAddress,
  companyPhone,
  companyEmail,
}: PurchaseOrderPdfProps) {
  const items = po.items || [];

  const vendorAddress = [
    po.vendor?.address,
    [po.vendor?.city, po.vendor?.state, po.vendor?.zip].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            {companyAddress && <Text style={styles.companySubtext}>{companyAddress}</Text>}
            {companyPhone && <Text style={styles.companySubtext}>{companyPhone}</Text>}
            {companyEmail && <Text style={styles.companySubtext}>{companyEmail}</Text>}
          </View>
          <View>
            <Text style={styles.poTitle}>Purchase Order</Text>
            <Text style={styles.poNumber}>{po.poNumber}</Text>
            <Text style={styles.statusBadge}>{formatStatus(po.status)}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Vendor</Text>
            <Text style={styles.infoTextBold}>{po.vendor?.name || 'N/A'}</Text>
            {po.vendor?.contactName && <Text style={styles.infoText}>Attn: {po.vendor.contactName}</Text>}
            {vendorAddress && <Text style={styles.infoText}>{vendorAddress}</Text>}
            {po.vendor?.phone && <Text style={styles.infoText}>{po.vendor.phone}</Text>}
            {po.vendor?.email && <Text style={styles.infoText}>{po.vendor.email}</Text>}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Order Details</Text>
            <Text style={styles.infoText}>Date: {formatDate(po.createdAt)}</Text>
            <Text style={styles.infoText}>Project: {po.project?.name || 'N/A'}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colName}>
              <Text style={styles.headerText}>Item</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.headerText}>Qty</Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.headerText}>Unit Cost</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.headerText}>Total</Text>
            </View>
          </View>

          {items.map((item, idx) => (
            <View key={item.id} style={idx % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
              <View style={styles.colName}>
                <Text style={styles.cellTextBold}>
                  {item.materialItem?.name || 'Unknown Item'}
                </Text>
                {item.materialItem?.description && (
                  <Text style={{ fontSize: 8, color: '#888', marginTop: 1 }}>
                    {item.materialItem.description}
                  </Text>
                )}
              </View>
              <View style={styles.colQty}>
                <Text style={styles.cellText}>{Number(item.quantityOrdered)}</Text>
              </View>
              <View style={styles.colUnit}>
                <Text style={styles.cellText}>{formatCurrency(item.unitCost)}</Text>
              </View>
              <View style={styles.colTotal}>
                <Text style={styles.cellTextBold}>{formatCurrency(item.totalCost)}</Text>
              </View>
            </View>
          ))}

          {items.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={{ ...styles.cellText, width: '100%', textAlign: 'center', color: '#999' }}>
                No items
              </Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(po.subtotal)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{formatCurrency(po.tax)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Shipping</Text>
              <Text style={styles.totalsValue}>{formatCurrency(po.shipping)}</Text>
            </View>
            <View style={styles.totalsFinalRow}>
              <Text style={styles.totalsFinalLabel}>Total</Text>
              <Text style={styles.totalsFinalValue}>{formatCurrency(po.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {po.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{po.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {po.poNumber} - Generated on {formatDate(new Date().toISOString())} by {companyName}
        </Text>
      </Page>
    </Document>
  );
}
