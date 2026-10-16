import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSecFilings = SlateTool.create(spec, {
  name: 'Search SEC Filings',
  key: 'search_sec_filings',
  description: `Search SEC EDGAR filings by company name or CIK code. First resolves the first company-name match to its CIK code, then retrieves submission history. Provide an exact CIK when names are ambiguous. Supports filtering by form type (8-K, 10-K, 10-Q, Form 4, etc.) and date range. You can also provide a CIK code directly to skip the lookup step.`,
  constraints: ['Available on Business plan only'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accessionNumber: z.string().optional().describe('Filter by a filing accession number.'),
      reportFrom: z.string().optional().describe('Start report date in YYYY-MM-DD format.'),
      reportTo: z.string().optional().describe('End report date in YYYY-MM-DD format.'),
      companyName: z
        .string()
        .optional()
        .describe(
          'Company name to search for (used for CIK lookup). Either companyName or cik is required.'
        ),
      cik: z
        .string()
        .optional()
        .describe('SEC CIK code. If provided, skips the company name lookup.'),
      formType: z
        .string()
        .optional()
        .describe('Filter by SEC form type (e.g. "10-K", "10-Q", "8-K", "4")'),
      dateFrom: z.string().optional().describe('Start filing date in YYYY-MM-DD format'),
      dateTo: z.string().optional().describe('End filing date in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Number of submissions to return (max 1000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional(),
      cik: z.string(),
      companyName: z.string().nullable(),
      pagination: z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        count: z.number().optional(),
        total: z.number().optional()
      }),
      submissions: z.array(
        z.object({
          accessionNumber: z.string(),
          filingDate: z.string(),
          reportDate: z.string().nullable(),
          form: z.string(),
          primaryDocument: z.string().nullable(),
          primaryDocumentDescription: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let cik = ctx.input.cik;
    let companyName: string | null = null;
    let lookupRaw: unknown;

    if (!cik && ctx.input.companyName) {
      let lookup = await client.getCikLookup({ query: ctx.input.companyName });
      if (lookup.data.length === 0) {
        throw createApiServiceError(
          'No company matched companyName. Try another name or supply its SEC cik.'
        );
      }
      lookupRaw = lookup.raw;
      cik = lookup.data[0]!.cik;
      companyName = lookup.data[0]!.name;
    }

    if (!cik) {
      throw createApiServiceError('Either companyName or cik must be provided.');
    }

    let result = await client.getSecSubmissions({
      cik,
      accessionNumber: ctx.input.accessionNumber,
      reportFrom: ctx.input.reportFrom,
      reportTo: ctx.input.reportTo,
      formType: ctx.input.formType,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let submissions = result.data.map(s => ({
      accessionNumber: s.accession_number,
      filingDate: s.filing_date,
      reportDate: s.report_date,
      form: s.form,
      primaryDocument: s.primary_document,
      primaryDocumentDescription: s.primary_document_description
    }));

    return {
      output: {
        cik,
        companyName: result.companyName ?? companyName,
        pagination: result.pagination,
        raw: { lookup: lookupRaw, submissions: result.raw },
        submissions
      },
      message: `Retrieved ${submissions.length} SEC filings for CIK **${cik}**${companyName ? ` (${companyName})` : ''}${ctx.input.formType ? ` filtered by form type "${ctx.input.formType}"` : ''}.`
    };
  })
  .build();
