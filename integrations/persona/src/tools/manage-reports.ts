import { SlateTool } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let createReport = SlateTool.create(spec, {
  name: 'Create Report',
  key: 'create_report',
  description: `Create a new background check or risk intelligence report. Supports all report types: Address Lookup, Adverse Media, Business Adverse Media, Watchlist, Business Watchlist, PEP, Email Address, Phone Number, and Profile.
Provide the report template ID and relevant attributes for the report type.`,
  instructions: [
    'The reportTemplateId determines the type of report to run.',
    'Required attributes vary by report type (e.g., email for email reports, phone for phone reports).'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      reportTemplateId: z.string().describe('Report template ID (starts with rptp_)'),
      referenceId: z.string().optional().describe('Your internal reference ID'),
      accountId: z.string().optional().describe('Persona account ID to associate with'),
      nameFirst: z.string().optional().describe('First name of the subject'),
      nameLast: z.string().optional().describe('Last name of the subject'),
      emailAddress: z.string().optional().describe('Email address (for email reports)'),
      phoneNumber: z.string().optional().describe('Phone number (for phone reports)'),
      addressStreet1: z.string().optional().describe('Street address line 1'),
      addressStreet2: z.string().optional().describe('Street address line 2'),
      addressCity: z.string().optional().describe('City'),
      addressSubdivision: z.string().optional().describe('State/province'),
      addressPostalCode: z.string().optional().describe('Postal/ZIP code'),
      addressCountryCode: z.string().optional().describe('Country code (ISO 3166-1 alpha-2)'),
      birthdate: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
      term: z
        .string()
        .optional()
        .describe('Search term (for adverse media / watchlist reports)')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('Persona report ID'),
      reportType: z.string().optional().describe('Report type'),
      status: z.string().optional().describe('Report status (pending, ready, errored)'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full report attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });

    let attrs: Record<string, any> = {};
    if (ctx.input.referenceId) attrs['reference-id'] = ctx.input.referenceId;
    if (ctx.input.accountId) attrs['account-id'] = ctx.input.accountId;
    if (ctx.input.nameFirst) attrs['name-first'] = ctx.input.nameFirst;
    if (ctx.input.nameLast) attrs['name-last'] = ctx.input.nameLast;
    if (ctx.input.emailAddress) attrs['email-address'] = ctx.input.emailAddress;
    if (ctx.input.phoneNumber) attrs['phone-number'] = ctx.input.phoneNumber;
    if (ctx.input.addressStreet1) attrs['address-street-1'] = ctx.input.addressStreet1;
    if (ctx.input.addressStreet2) attrs['address-street-2'] = ctx.input.addressStreet2;
    if (ctx.input.addressCity) attrs['address-city'] = ctx.input.addressCity;
    if (ctx.input.addressSubdivision)
      attrs['address-subdivision'] = ctx.input.addressSubdivision;
    if (ctx.input.addressPostalCode)
      attrs['address-postal-code'] = ctx.input.addressPostalCode;
    if (ctx.input.addressCountryCode)
      attrs['address-country-code'] = ctx.input.addressCountryCode;
    if (ctx.input.birthdate) attrs.birthdate = ctx.input.birthdate;
    if (ctx.input.term) attrs.term = ctx.input.term;

    let result = await client.createReport(ctx.input.reportTemplateId, attrs);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        reportId: result.data?.id,
        reportType: result.data?.type,
        status: normalized.status,
        attributes: normalized
      },
      message: `Created report **${result.data?.id}** (${result.data?.type}). Status: **${normalized.status || 'pending'}**.`
    };
  })
  .build();

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Retrieve the details of a specific report including its status, matches, and findings.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      reportId: z.string().describe('Persona report ID (starts with rep_)')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('Report ID'),
      reportType: z
        .string()
        .optional()
        .describe('Report type (e.g., report/watchlist, report/adverse-media)'),
      status: z.string().optional().describe('Report status (pending, ready, errored)'),
      hasMatch: z.boolean().optional().describe('Whether the report found any matches'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full report attributes including findings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.getReport(ctx.input.reportId);
    let n = normalizeResource(result.data);

    return {
      output: {
        reportId: result.data?.id,
        reportType: result.data?.type,
        status: n.status,
        hasMatch: n['has-match'] ?? n.has_match,
        createdAt: n['created-at'] || n.created_at,
        completedAt: n['completed-at'] || n.completed_at,
        attributes: n
      },
      message: `Report **${result.data?.id}** (${result.data?.type}) is **${n.status}**.${n['has-match'] || n.has_match ? ' **Match found.**' : ''}`
    };
  })
  .build();

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List reports with optional filters. Supports cursor-based pagination.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      filterReportTemplateId: z.string().optional().describe('Filter by report template ID'),
      filterReferenceId: z.string().optional().describe('Filter by reference ID'),
      filterAccountId: z.string().optional().describe('Filter by account ID'),
      filterStatus: z
        .string()
        .optional()
        .describe('Filter by status (pending, ready, errored)'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageCursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      reports: z
        .array(
          z.object({
            reportId: z.string().describe('Report ID'),
            reportType: z.string().optional().describe('Report type'),
            status: z.string().optional().describe('Status'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of reports'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listReports({
      filterReportTemplateId: ctx.input.filterReportTemplateId,
      filterReferenceId: ctx.input.filterReferenceId,
      filterAccountId: ctx.input.filterAccountId,
      filterStatus: ctx.input.filterStatus,
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });

    let reports = (result.data || []).map((item: any) => {
      let n = normalizeResource(item);
      return {
        reportId: item.id,
        reportType: item.type,
        status: n.status,
        createdAt: n['created-at'] || n.created_at
      };
    });

    let nextCursor: string | undefined;
    if (result.links?.next) {
      try {
        let parsed = new URL(result.links.next, 'https://withpersona.com');
        nextCursor = parsed.searchParams.get('page[after]') || undefined;
      } catch {
        /* ignore */
      }
    }

    return {
      output: { reports, nextCursor },
      message: `Found **${reports.length}** reports.`
    };
  })
  .build();
