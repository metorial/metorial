import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

let extractedFieldSchema = z
  .object({
    value: z.string().optional().describe('Extracted text value'),
    confidence: z.number().optional().describe('Confidence score between 0 and 1'),
    page: z.number().optional().describe('Page number where the field was found')
  })
  .passthrough();

let productItemSchema = z
  .record(z.string(), extractedFieldSchema)
  .describe(
    'Product line item with fields like ProductName, ProductPrice, ProductQuantity, etc.'
  );

let taxSchema = z
  .record(z.string(), extractedFieldSchema)
  .describe(
    'Tax entry with fields like TaxPercentage, TaxAmount, TaxNetAmount, TaxGrossAmount'
  );

let paymentSchema = z
  .record(z.string(), extractedFieldSchema)
  .describe('Payment method entry');

let paymentBankSchema = z
  .record(z.string(), extractedFieldSchema)
  .describe('Bank details entry with BIC, IBAN, BankName');

let signatureSchema = z
  .object({
    image: z.string().optional().describe('Base64-encoded signature image'),
    binary: z.string().optional().describe('Base64-encoded binary signature'),
    boundingBox: z
      .array(z.number())
      .optional()
      .describe('Bounding box coordinates [left, top, right, bottom]'),
    page: z.number().optional().describe('Page number'),
    confidence: z.number().optional().describe('Detection confidence')
  })
  .passthrough();

let qrCodeSchema = z
  .object({
    text: z.string().optional().describe('Decoded QR code text'),
    page: z.number().optional().describe('Page number')
  })
  .passthrough();

export let processFinanceDocument = SlateTool.create(spec, {
  name: 'Process Finance Document',
  key: 'process_finance_document',
  description: `Extract structured data from an invoice or receipt using OCR. Automatically classifies the document type (Invoice, Receipt, or CreditMemo) and extracts all relevant fields including sender/receiver details, line items, taxes, totals, payment methods, bank details, QR codes, and signatures.

You can target a specific document type (invoice or receipt) or let the API auto-classify using the unified finance endpoint.`,
  instructions: [
    'Provide the document as a base64-encoded file with its original file name including extension (e.g., "invoice.pdf").',
    'Use documentType "auto" to let the API detect whether it is an invoice or receipt. Use "invoice" or "receipt" for targeted extraction.',
    'Enable signature extraction only when needed as it incurs an additional page charge.'
  ],
  constraints: [
    'Supported file formats: PDF, PNG, JPG/JPEG, TIF/TIFF.',
    'Each page of a multi-page document counts as one API request toward your quota.',
    'Processing time is typically under 5 seconds per page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileBase64: z.string().describe('Base64-encoded document file content'),
      fileName: z
        .string()
        .describe('Original file name with extension (e.g., "invoice.pdf", "receipt.jpg")'),
      documentType: z
        .enum(['auto', 'invoice', 'receipt'])
        .default('auto')
        .describe(
          'Document type to process. "auto" uses the unified finance endpoint that auto-classifies.'
        ),
      privacy: z
        .boolean()
        .optional()
        .describe('When true, the file is not stored on the server. Defaults to true.'),
      includePolygons: z
        .boolean()
        .optional()
        .describe('Include coordinate data for text location on the document'),
      includeFullText: z
        .boolean()
        .optional()
        .describe('Include the full extracted text per page for searchability'),
      extractSignatures: z
        .boolean()
        .optional()
        .describe('Extract signatures from the document (incurs additional page charge)'),
      prioritizeSpeed: z
        .boolean()
        .optional()
        .describe('Prioritize processing speed over accuracy (receipt only)')
    })
  )
  .output(
    z.object({
      docType: z
        .string()
        .optional()
        .describe('Detected document type: Invoice, Receipt, or CreditMemo'),
      general: z
        .record(z.string(), extractedFieldSchema)
        .optional()
        .describe(
          'General extracted fields including shop info, customer info, dates, totals, etc.'
        ),
      productItems: z.array(productItemSchema).optional().describe('Extracted line items'),
      taxes: z.array(taxSchema).optional().describe('Tax breakdown entries'),
      payments: z.array(paymentSchema).optional().describe('Payment method entries'),
      paymentBanks: z.array(paymentBankSchema).optional().describe('Bank details entries'),
      signatures: z.array(signatureSchema).optional().describe('Extracted signatures'),
      qrCodes: z.array(qrCodeSchema).optional().describe('Detected QR codes'),
      performanceOption: z
        .string()
        .optional()
        .describe('Algorithm used: ACCURACY, SPEED, or FALLBACK'),
      fileHash: z.string().optional().describe('MD5 hash for duplicate detection'),
      languages: z.array(z.string()).optional().describe('Detected language codes'),
      mainLanguage: z.string().optional().describe('Primary detected language'),
      fullText: z
        .any()
        .optional()
        .describe('Full extracted text per page (when includeFullText is enabled)'),
      pages: z
        .array(z.object({ height: z.number(), width: z.number() }).passthrough())
        .optional()
        .describe('Page dimensions'),
      version: z.string().optional().describe('Algorithm version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Processing document...');

    let result: any;
    let { documentType } = ctx.input;

    if (documentType === 'invoice') {
      result = await client.processInvoice({
        fileBase64: ctx.input.fileBase64,
        fileName: ctx.input.fileName,
        privacy: ctx.input.privacy,
        polygon: ctx.input.includePolygons,
        fullText: ctx.input.includeFullText,
        signature: ctx.input.extractSignatures
      });
    } else if (documentType === 'receipt') {
      result = await client.processReceipt({
        fileBase64: ctx.input.fileBase64,
        fileName: ctx.input.fileName,
        privacy: ctx.input.privacy,
        polygon: ctx.input.includePolygons,
        fullText: ctx.input.includeFullText,
        speed: ctx.input.prioritizeSpeed
      });
    } else {
      result = await client.processFinance({
        fileBase64: ctx.input.fileBase64,
        fileName: ctx.input.fileName,
        privacy: ctx.input.privacy,
        polygon: ctx.input.includePolygons,
        fullText: ctx.input.includeFullText,
        signature: ctx.input.extractSignatures
      });
    }

    let docType = result.docType || 'Unknown';
    let itemCount = result.productItems?.length || 0;
    let totalPrice = result.general?.TotalPrice?.value;

    let messageParts = [`**${docType}** processed successfully.`];
    if (itemCount > 0) messageParts.push(`${itemCount} line item(s) extracted.`);
    if (totalPrice)
      messageParts.push(
        `Total: ${totalPrice}${result.general?.Currency?.value ? ` ${result.general.Currency.value}` : ''}.`
      );
    if (result.mainLanguage) messageParts.push(`Language: ${result.mainLanguage}.`);

    return {
      output: result,
      message: messageParts.join(' ')
    };
  })
  .build();
