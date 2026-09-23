import { SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { ksefValidationError } from '../lib/errors';
import { spec } from '../spec';

const INVOICE_MIME_TYPE = 'application/xml';
// The optional hyphen between the two technical halves preserves KSeF 1.0 numbers.
const KSEF_NUMBER_PATTERN =
  /^([1-9](\d[1-9]|[1-9]\d)\d{7})-(20[2-9][0-9]|2[1-9]\d{2}|[3-9]\d{3})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])-([0-9A-F]{6})-?([0-9A-F]{6})-([0-9A-F]{2})$/;

export const downloadInvoiceTool = SlateTool.create(spec, {
  name: 'Download Invoice',
  key: 'download_invoice',
  description: 'Download the original XML invoice identified by its KSeF number.',
  constraints: ['The connected KSeF token must have InvoiceRead permission.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ksefNumber: z
        .string()
        .describe('35- or 36-character KSeF number assigned to the invoice')
    })
  )
  .output(
    z.object({
      ksefNumber: z.string().describe('KSeF number of the invoice'),
      fileName: z.string().describe('Suggested name for the downloaded XML file'),
      mimeType: z.string().describe('MIME type of the invoice file')
    })
  )
  .handleInvocation(async ctx => {
    const { ksefNumber } = ctx.input;
    if (!KSEF_NUMBER_PATTERN.test(ksefNumber)) {
      throw ksefValidationError('Provide a valid 35- or 36-character KSeF invoice number.');
    }

    const client = new KsefClient(ctx.auth);
    const fileName = `${ksefNumber}.xml`;

    await ctx.addAttachment({
      type: 'url',
      url: client.downloadUrl(`/invoices/ksef/${encodeURIComponent(ksefNumber)}`),
      mimeType: INVOICE_MIME_TYPE,
      headers: client.attachmentHeaders()
    });

    return {
      output: { ksefNumber, fileName, mimeType: INVOICE_MIME_TYPE },
      message: `Prepared original XML invoice **${ksefNumber}** for download.`
    };
  })
  .build();
