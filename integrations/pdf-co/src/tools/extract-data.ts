import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdfCoApiError } from '../lib/errors';
import { spec } from '../spec';

export let parseInvoice = SlateTool.create(spec, {
  name: 'Parse Invoice',
  key: 'parse_invoice',
  description: `Automatically extract structured data from invoice documents using AI. Detects invoice layouts without manual template configuration.
Extracts vendor info, customer info, invoice details, payment information, line items, and more.`,
  constraints: [
    'Only works with invoice documents. For other document types, use the "Parse Document" tool.',
    'PDF must not exceed 100 pages. Multi-page invoices should be split into individual PDFs first.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the invoice PDF, JPG, or PNG file')
    })
  )
  .output(
    z.object({
      parsedData: z
        .any()
        .describe(
          'Structured invoice data including vendor, customer, invoice details, payment info, and line items'
        ),
      pageCount: z.number().describe('Number of pages in the document'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.parseInvoice({
      url: ctx.input.sourceUrl
    });

    if (result.error) {
      throw pdfCoApiError('Invoice parsing failed', result);
    }

    return {
      output: {
        parsedData: result.body,
        pageCount: result.pageCount,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits
      },
      message: `Parsed invoice successfully — extracted structured data from ${result.pageCount} page(s).`
    };
  })
  .build();

export let parseDocument = SlateTool.create(spec, {
  name: 'Parse Document',
  key: 'parse_document',
  description: `Extract structured data from PDF, JPG, or PNG documents using a document parser template. Templates define which fields, tables, and values to extract.
Use template ID "1" for the built-in general invoice template, or specify a custom template ID for your own extraction rules.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the document (PDF, JPG, or PNG) to parse'),
      templateId: z
        .string()
        .describe(
          'Document parser template ID. Use "1" for the built-in general invoice template.'
        ),
      password: z.string().optional().describe('Password for protected PDF files')
    })
  )
  .output(
    z.object({
      parsedData: z.any().describe('Extracted data based on the template configuration'),
      pageCount: z.number().describe('Number of pages in the document'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.parseDocument({
      url: ctx.input.sourceUrl,
      templateId: ctx.input.templateId,
      password: ctx.input.password
    });

    if (result.error) {
      throw pdfCoApiError('Document parsing failed', result);
    }

    return {
      output: {
        parsedData: result.body,
        pageCount: result.pageCount,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits
      },
      message: `Parsed document using template **${ctx.input.templateId}** — extracted data from ${result.pageCount} page(s).`
    };
  })
  .build();

export let classifyDocument = SlateTool.create(spec, {
  name: 'Classify Document',
  key: 'classify_document',
  description: `Automatically classify a document based on keyword-based rules. Useful for sorting incoming documents (e.g., identifying which vendor provided a document) to determine the appropriate extraction template.
Provide custom classification rules in CSV format, or use a URL to an external CSV rules file.`,
  instructions: [
    'Rules follow CSV format: "className,logicType,keyword1,keyword2,...". Logic types are "OR" (default) or "AND".',
    'Supports regex patterns like "/pattern/i" for case-insensitive matching.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the document to classify'),
      rulesCsv: z
        .string()
        .optional()
        .describe(
          'Classification rules in CSV format, e.g. "VendorA,OR,keyword1,keyword2\\nVendorB,AND,keyword3,keyword4"'
        ),
      rulesCsvUrl: z
        .string()
        .optional()
        .describe('URL to an external CSV file containing classification rules'),
      caseSensitive: z
        .boolean()
        .optional()
        .describe('Case-sensitive keyword matching (default: true)'),
      password: z.string().optional().describe('Password for protected PDF files')
    })
  )
  .output(
    z.object({
      classes: z
        .array(
          z.object({
            className: z.string().describe('Matched classification class name')
          })
        )
        .describe('List of matched document classes'),
      pageCount: z.number().describe('Number of pages in the document'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.classifyDocument({
      url: ctx.input.sourceUrl,
      rulescsv: ctx.input.rulesCsv,
      rulescsvurl: ctx.input.rulesCsvUrl,
      caseSensitive: ctx.input.caseSensitive,
      password: ctx.input.password
    });

    if (result.error) {
      throw pdfCoApiError('Document classification failed', result);
    }

    let classes = (result.body?.classes || []).map((c: any) => ({
      className: c.class || c.className
    }));

    return {
      output: {
        classes,
        pageCount: result.pageCount,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits
      },
      message: `Classified document into **${classes.length}** class(es)${classes.length > 0 ? `: ${classes.map((c: any) => c.className).join(', ')}` : ''}.`
    };
  })
  .build();
