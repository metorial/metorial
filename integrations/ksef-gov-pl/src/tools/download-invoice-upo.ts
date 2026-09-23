import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { spec } from '../spec';

const UPO_MIME_TYPE = 'application/xml';

type InvoiceStatusResponse = {
  referenceNumber: string;
  ksefNumber?: string | null;
  upoDownloadUrl?: string | null;
  status: {
    code: number;
    description?: string;
  };
};

export const downloadInvoiceUpoTool = SlateTool.create(spec, {
  name: 'Download Invoice UPO',
  key: 'download_invoice_upo',
  description: 'Download the official receipt for an accepted invoice in a KSeF session.',
  constraints: [
    'The invoice must be accepted and its receipt available.',
    'The connected KSeF token must have InvoiceWrite, Introspection, PefInvoiceWrite, or EnforcementOperations permission.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      sessionReferenceNumber: z
        .string()
        .trim()
        .min(1)
        .describe('Reference number of the submission session'),
      invoiceReferenceNumber: z
        .string()
        .trim()
        .min(1)
        .describe('Reference number assigned when the invoice was submitted')
    })
  )
  .output(
    z.object({
      sessionReferenceNumber: z
        .string()
        .describe('Reference number of the submission session'),
      invoiceReferenceNumber: z.string().describe('Reference number of the submitted invoice'),
      ksefNumber: z.string().describe('KSeF number assigned to the accepted invoice'),
      fileName: z.string().describe('Suggested name for the downloaded receipt'),
      mimeType: z.string().describe('MIME type of the receipt file')
    })
  )
  .handleInvocation(async ctx => {
    const client = new KsefClient(ctx.auth);
    const { sessionReferenceNumber, invoiceReferenceNumber } = ctx.input;
    const invoicePath = `/sessions/${encodeURIComponent(sessionReferenceNumber)}/invoices/${encodeURIComponent(invoiceReferenceNumber)}`;
    const invoice = await client.request<InvoiceStatusResponse>(
      'get invoice status',
      'GET',
      invoicePath,
      { safeRead: true }
    );

    if (
      !invoice ||
      invoice.referenceNumber !== invoiceReferenceNumber ||
      typeof invoice.status?.code !== 'number'
    ) {
      throw createApiServiceError(
        'KSeF returned an invalid invoice status. Check the session and invoice reference numbers, then try again.'
      );
    }

    if (invoice.status.code === 100 || invoice.status.code === 150) {
      throw createApiServiceError(
        `Invoice ${invoiceReferenceNumber} is still processing in session ${sessionReferenceNumber}. Check its status and try downloading the receipt after processing completes.`
      );
    }

    if (invoice.status.code !== 200) {
      throw createApiServiceError(
        `Invoice ${invoiceReferenceNumber} has status ${invoice.status.code}${invoice.status.description ? ` (${invoice.status.description})` : ''} and has no receipt for this submission. Check the invoice status for the reason and any original invoice references.`
      );
    }

    if (!invoice.ksefNumber || !invoice.upoDownloadUrl) {
      throw createApiServiceError(
        `The receipt for invoice ${invoiceReferenceNumber} is not available yet. Check its status and retry after KSeF provides the receipt.`
      );
    }

    const fileName = `upo-${invoice.ksefNumber}.xml`;
    await ctx.addAttachment({
      type: 'url',
      url: client.downloadUrl(`${invoicePath}/upo`),
      mimeType: UPO_MIME_TYPE,
      headers: client.attachmentHeaders()
    });

    return {
      output: {
        sessionReferenceNumber,
        invoiceReferenceNumber,
        ksefNumber: invoice.ksefNumber,
        fileName,
        mimeType: UPO_MIME_TYPE
      },
      message: `Prepared the official receipt for invoice **${invoice.ksefNumber}** for download.`
    };
  })
  .build();
