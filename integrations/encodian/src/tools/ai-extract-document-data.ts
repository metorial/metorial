import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let aiExtractDocumentData = SlateTool.create(spec, {
  name: 'AI Extract Document Data',
  key: 'ai_extract_document_data',
  description: `Use AI to extract structured data as JSON from specific document types including invoices, receipts, contracts, ID documents, credit cards, bank checks, bank statements, pay stubs, tax documents, health insurance cards, marriage certificates, and mortgage documents.
Returns extracted fields as structured JSON for easy integration into workflows.`,
  instructions: [
    'Choose the appropriate document type for accurate extraction.',
    'The result is returned as a JSON string in the extractedData field.',
    'Use queryFields to request specific fields from the document.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentType: z
        .enum([
          'invoice',
          'receipt',
          'contract',
          'id_document',
          'credit_card',
          'bank_check_us',
          'bank_statement_us',
          'health_insurance_card_us',
          'marriage_certificate_us',
          'mortgage_us',
          'pay_stub_us',
          'tax_us'
        ])
        .describe('Type of document to process'),
      fileContent: z.string().describe('Base64-encoded document file content'),
      dateFormat: z.string().optional().describe('DateTime format string for extracted dates'),
      removeNewLines: z
        .boolean()
        .optional()
        .describe('Remove line breaks from extracted text'),
      queryFields: z
        .string()
        .optional()
        .describe('Comma-separated list of specific fields to extract'),
      mortgageModel: z
        .string()
        .optional()
        .describe(
          'Mortgage model type (e.g., Mortgage1003, MortgageClosingDisclosure) - only for mortgage documents'
        ),
      taxModel: z
        .string()
        .optional()
        .describe('Tax form model (e.g., TaxUS, TaxW2, Tax1040) - only for tax documents')
    })
  )
  .output(
    z.object({
      extractedData: z
        .string()
        .describe('JSON string containing the extracted structured data'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let endpointMap: Record<string, string> = {
      invoice: 'AIProcessInvoice',
      receipt: 'AIProcessReceipt',
      contract: 'AIProcessContract',
      id_document: 'AIProcessIDDocument',
      credit_card: 'AIProcessCreditCard',
      bank_check_us: 'AIProcessBankCheckUS',
      bank_statement_us: 'AIProcessBankStatementUS',
      health_insurance_card_us: 'AIProcessHealthInsuranceCardUS',
      marriage_certificate_us: 'AIProcessMarriageCertificateUS',
      mortgage_us: 'AIProcessMortgageUS',
      pay_stub_us: 'AIProcessPayStubUS',
      tax_us: 'AIProcessTaxUS'
    };

    let body: Record<string, any> = {
      fileContent: ctx.input.fileContent
    };

    if (ctx.input.dateFormat) body.dateFormat = ctx.input.dateFormat;
    if (ctx.input.removeNewLines !== undefined) body.removeNewLines = ctx.input.removeNewLines;
    if (ctx.input.queryFields) body.queryFields = ctx.input.queryFields;
    if (ctx.input.mortgageModel) body.processFileMortgageModel = ctx.input.mortgageModel;
    if (ctx.input.taxModel) body.processFileTaxModel = ctx.input.taxModel;

    let endpoint = endpointMap[ctx.input.documentType] as string;
    let result = await client.aiProcessDocument(endpoint, body);

    return {
      output: {
        extractedData: result.result || '',
        operationId: result.OperationId || ''
      },
      message: `Successfully extracted data from **${ctx.input.documentType.replace(/_/g, ' ')}** document using AI.`
    };
  })
  .build();
