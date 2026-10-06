import { z } from 'zod';
import { MoneybirdClient } from './client';
import { administration, exactId, fail, pathValue, validateToken } from './validation';

const referenceSchema = z
  .object({
    administrationId: z.string(),
    salesInvoiceId: z.string(),
    format: z.enum(['pdf', 'ubl']),
    stationery: z.boolean().optional()
  })
  .strict();
export const invoiceFile = async (token: string, reference: unknown, originalUrl?: string) => {
  const parsed = referenceSchema.safeParse(reference);
  if (!parsed.success)
    throw fail('The invoice download reference is invalid. Prepare a new download.');
  const data = parsed.data;
  validateToken(token);
  const adminId = administration(data.administrationId);
  if (!/^[1-9]\d*$/.test(data.salesInvoiceId) || (data.format !== 'pdf' && data.stationery))
    throw fail('Prepare a valid PDF or UBL invoice download.');
  const url = `https://moneybird.com/api/v2/${adminId}/sales_invoices/${pathValue(data.salesInvoiceId)}/download_${data.format}.json`;
  if (originalUrl !== undefined && originalUrl !== url)
    throw fail(
      'The invoice download URL does not match its reference. Prepare a new download.'
    );
  const client = new MoneybirdClient({ token, administrationId: adminId });
  const invoice = await client.getSalesInvoice(data.salesInvoiceId);
  if (exactId(invoice.id) !== data.salesInvoiceId)
    throw fail('Invoice download identity could not be confirmed.');
  const query: Record<string, string> = data.stationery ? { media: 'stationery' } : {};
  return {
    url,
    headers: { Authorization: `Bearer ${token}` },
    query,
    reference: data,
    // Revalidate access at the same interval as Moneybird's PDF storage redirect lifetime.
    expiresAt: new Date(Date.now() + 30000).toISOString(),
    fileName: `invoice-${data.salesInvoiceId}.${data.format === 'pdf' ? 'pdf' : 'xml'}`,
    mimeType: data.format === 'pdf' ? 'application/pdf' : 'application/xml'
  };
};
