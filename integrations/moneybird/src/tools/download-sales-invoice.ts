import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoiceFile } from '../lib/files';
import { administrationIdSchema } from '../lib/schemas';
import { administration, checkedOutput, validateToolInput } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  salesInvoiceId: z.string(),
  format: z.enum(['pdf', 'ubl']),
  fileName: z.string(),
  mimeType: z.string()
});
export const downloadSalesInvoice = SlateTool.create(spec, {
  key: 'download_sales_invoice',
  name: 'Download Sales Invoice',
  description:
    'Prepare a downloadable sales invoice as PDF or UBL XML. Call list_administrations to select the administration.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      administrationId: administrationIdSchema,
      salesInvoiceId: z
        .string()
        .describe('Invoice ID from list_sales_invoices or get_sales_invoice.'),
      format: z.enum(['pdf', 'ubl']).optional().default('pdf'),
      stationery: z
        .boolean()
        .optional()
        .describe('Render PDF for preprinted stationery. Applies only to PDF.')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    validateToolInput('download_sales_invoice', ctx.input);
    return checkedOutput(outputSchema, async () => {
      const reference = {
        administrationId: administration(
          ctx.input.administrationId ?? ctx.config.administrationId
        ),
        salesInvoiceId: ctx.input.salesInvoiceId,
        format: ctx.input.format,
        stationery: ctx.input.stationery
      };
      const file = await invoiceFile(ctx.auth.token, reference);
      await ctx.addAttachment({
        type: 'url',
        url: file.url,
        headers: file.headers,
        query: file.query,
        mimeType: file.mimeType,
        filename: file.fileName,
        refreshReference: file.reference,
        refreshAt: file.expiresAt
      });
      return {
        output: {
          salesInvoiceId: ctx.input.salesInvoiceId,
          format: ctx.input.format,
          fileName: file.fileName,
          mimeType: file.mimeType
        },
        message: `Prepared ${file.fileName} for download.`
      };
    });
  })
  .build();
