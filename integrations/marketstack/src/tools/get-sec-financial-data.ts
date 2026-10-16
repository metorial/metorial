import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSecFinancialData = SlateTool.create(spec, {
  name: 'Get SEC Financial Data',
  key: 'get_sec_financial_data',
  description: `Retrieve XBRL financial data from SEC EDGAR filings. Supports two modes:
- **Company facts**: Get specific financial metrics (e.g. US-GAAP accounts payable) for a company across all filings by CIK code.
- **Frames**: Retained generalized frames request for existing clients. Use get_accounts_payable_frames for the current documented US-GAAP AccountsPayableCurrent frame API.`,
  constraints: ['Available on Business plan only'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['company_facts', 'frames'])
        .describe('Whether to query company-specific facts or aggregated frames'),
      cik: z.string().optional().describe('SEC CIK code (required for company_facts mode)'),
      taxonomy: z
        .string()
        .optional()
        .describe(
          'XBRL taxonomy (e.g. "us-gaap"). Required for frames mode, optional filter for company_facts'
        ),
      tag: z
        .string()
        .optional()
        .describe(
          'XBRL concept tag (e.g. "AccountsPayableCurrent"). Required for frames mode, optional filter for company_facts'
        ),
      unit: z.string().optional().describe('XBRL unit (e.g. "USD"). Required for frames mode'),
      period: z
        .string()
        .optional()
        .describe('Calendar period (e.g. "CY2023Q1"). Required for frames mode'),
      limit: z.number().optional().describe('Number of results to return (max 1000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional(),
      pagination: z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        count: z.number().optional(),
        total: z.number().optional()
      }),
      facts: z.array(
        z.object({
          taxonomy: z.string(),
          tag: z.string(),
          label: z.string(),
          description: z.string().nullable(),
          unit: z.string(),
          value: z.number().nullable(),
          start: z.string().nullable().optional(),
          end: z.string(),
          filed: z.string(),
          form: z.string(),
          accessionNumber: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'company_facts') {
      if (!ctx.input.cik) {
        throw createApiServiceError('cik is required for company_facts mode.');
      }

      let result = await client.getSecCompanyFacts({
        cik: ctx.input.cik,
        taxonomy: ctx.input.taxonomy,
        tag: ctx.input.tag,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let facts = result.data.map(f => ({
        taxonomy: f.taxonomy,
        tag: f.tag,
        label: f.label,
        description: f.description,
        unit: f.unit,
        value: f.value,
        start: f.start,
        end: f.end,
        filed: f.filed,
        form: f.form,
        accessionNumber: f.accession_number
      }));

      return {
        output: { pagination: result.pagination, raw: result.raw, facts },
        message: `Retrieved ${facts.length} financial facts for CIK **${ctx.input.cik}**.`
      };
    } else {
      if (!ctx.input.taxonomy || !ctx.input.tag || !ctx.input.unit || !ctx.input.period) {
        throw createApiServiceError(
          'taxonomy, tag, unit, and period are required for frames mode.'
        );
      }

      let result = await client.getSecFrames({
        taxonomy: ctx.input.taxonomy,
        tag: ctx.input.tag,
        unit: ctx.input.unit,
        period: ctx.input.period,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let facts = result.data.map(f => ({
        taxonomy: f.taxonomy,
        tag: f.tag,
        label: f.label,
        description: f.description,
        unit: f.unit,
        value: f.value,
        start: f.start,
        end: f.end,
        filed: f.filed,
        form: f.form,
        accessionNumber: f.accession_number
      }));

      return {
        output: { pagination: result.pagination, raw: result.raw, facts },
        message: `Retrieved ${facts.length} XBRL frame entries for **${ctx.input.taxonomy}:${ctx.input.tag}** (${ctx.input.period}).`
      };
    }
  })
  .build();
