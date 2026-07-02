import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchLeads = SlateTool.create(spec, {
  name: 'Search Leads',
  key: 'search_leads',
  description: `Search and list leads in AgencyZoom with flexible filtering options. Filter by status, producer, lead source, pipeline, stage, and date range. Supports pagination with offset and limit.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Free-text search query to match against lead name, email, phone, etc.'),
      status: z
        .enum(['new', 'contacted', 'quoted', 'won', 'lost', 'x-dated'])
        .optional()
        .describe('Filter leads by their current status'),
      producerId: z
        .string()
        .optional()
        .describe('Filter leads assigned to a specific producer by their ID'),
      leadSourceId: z.string().optional().describe('Filter leads by their lead source ID'),
      pipelineId: z
        .string()
        .optional()
        .describe('Filter leads belonging to a specific pipeline by ID'),
      stageId: z
        .string()
        .optional()
        .describe('Filter leads at a specific pipeline stage by ID'),
      fromDate: z
        .string()
        .optional()
        .describe(
          'Start date for filtering leads by creation date (ISO 8601 format, e.g. "2024-01-01")'
        ),
      toDate: z
        .string()
        .optional()
        .describe(
          'End date for filtering leads by creation date (ISO 8601 format, e.g. "2024-12-31")'
        ),
      offset: z
        .number()
        .optional()
        .describe('Number of records to skip for pagination (default 0)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of leads to return (default varies by API)')
    })
  )
  .output(
    z.object({
      leads: z
        .array(
          z.object({
            leadId: z.string().describe('Unique identifier of the lead'),
            firstName: z.string().optional().describe('First name of the lead'),
            lastName: z.string().optional().describe('Last name of the lead'),
            email: z.string().optional().describe('Email address of the lead'),
            phone: z.string().optional().describe('Phone number of the lead'),
            status: z.string().optional().describe('Current status of the lead'),
            producer: z.any().optional().describe('Producer (agent) assigned to the lead'),
            leadSource: z
              .any()
              .optional()
              .describe('Source through which the lead was acquired'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when the lead was created')
          })
        )
        .describe('Array of leads matching the search criteria'),
      total: z.number().describe('Total number of leads matching the search criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.search !== undefined) params.search = ctx.input.search;
    if (ctx.input.status !== undefined) params.status = ctx.input.status;
    if (ctx.input.producerId !== undefined) params.producerId = ctx.input.producerId;
    if (ctx.input.leadSourceId !== undefined) params.leadSourceId = ctx.input.leadSourceId;
    if (ctx.input.pipelineId !== undefined) params.pipelineId = ctx.input.pipelineId;
    if (ctx.input.stageId !== undefined) params.stageId = ctx.input.stageId;
    if (ctx.input.fromDate !== undefined) params.fromDate = ctx.input.fromDate;
    if (ctx.input.toDate !== undefined) params.toDate = ctx.input.toDate;
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;

    let result = await client.searchLeads(params);

    let leads = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    let total = result.total ?? result.count ?? leads.length;

    let mappedLeads = leads.map((lead: Record<string, any>) => ({
      leadId: lead.leadId ?? lead.id ?? '',
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      producer: lead.producer,
      leadSource: lead.leadSource,
      createdAt: lead.createdAt
    }));

    return {
      output: {
        leads: mappedLeads,
        total
      },
      message: `Found **${total}** lead(s).${mappedLeads.length < total ? ` Showing ${mappedLeads.length} results.` : ''}`
    };
  })
  .build();
