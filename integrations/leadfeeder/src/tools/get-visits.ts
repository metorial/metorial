import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

let visitRouteStepSchema = z.object({
  hostname: z.string(),
  pagePath: z.string(),
  previousPagePath: z.string(),
  timeOnPage: z.number().describe('Time spent on this page in seconds'),
  pageTitle: z.string(),
  pageUrl: z.string(),
  displayPageName: z.string()
});

let visitSchema = z.object({
  visitId: z.string(),
  source: z.string().describe('Traffic source'),
  medium: z.string().describe('Traffic medium'),
  campaign: z.string().describe('Campaign name'),
  referringUrl: z.string(),
  pageDepth: z.number().describe('Number of pages viewed'),
  landingPagePath: z.string(),
  visitRoute: z.array(visitRouteStepSchema).describe('Page-by-page visit path'),
  keyword: z.string(),
  queryTerm: z.string(),
  visitLength: z.number().describe('Visit duration in seconds'),
  startedAt: z.string().describe('Visit start time in ISO8601 format'),
  leadId: z.string(),
  lfClientId: z.string().describe('Leadfeeder visitor ID'),
  gaClientIds: z.array(z.string()).describe('Google Analytics client IDs'),
  visitorEmail: z.string(),
  visitorFirstName: z.string(),
  visitorLastName: z.string(),
  countryCode: z.string(),
  deviceType: z.string()
});

export let getVisits = SlateTool.create(spec, {
  name: 'Get Visits',
  key: 'get_visits',
  description: `Retrieve visit data for a specific lead or across all leads within a date range. Includes traffic source, medium, campaign, referring URL, landing page, page-by-page route with time on each page, visit duration, device type, and identified visitor info when available.`,
  instructions: [
    'Provide a leadId to get visits for a specific company, or omit it to get all visits across all leads.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('Leadfeeder account ID. Falls back to config or first available account.'),
      leadId: z
        .string()
        .optional()
        .describe('Lead ID to get visits for. If omitted, returns visits across all leads.'),
      startDate: z.string().describe('Start date in yyyy-mm-dd format'),
      endDate: z.string().describe('End date in yyyy-mm-dd format'),
      pageNumber: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Results per page, 1-100 (default: 100)')
    })
  )
  .output(
    z.object({
      visits: z.array(visitSchema),
      hasMore: z.boolean().describe('Whether more pages of results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadfeederClient(ctx.auth.token);

    let accountId = ctx.input.accountId ?? ctx.config.accountId;
    if (!accountId) {
      let accounts = await client.getAccounts();
      if (accounts.length === 0) throw new Error('No Leadfeeder accounts found');
      accountId = accounts[0]!.accountId;
    }

    let result = ctx.input.leadId
      ? await client.getVisitsForLead(accountId, ctx.input.leadId, {
          startDate: ctx.input.startDate,
          endDate: ctx.input.endDate,
          pageNumber: ctx.input.pageNumber,
          pageSize: ctx.input.pageSize
        })
      : await client.getVisits(accountId, {
          startDate: ctx.input.startDate,
          endDate: ctx.input.endDate,
          pageNumber: ctx.input.pageNumber,
          pageSize: ctx.input.pageSize
        });

    return {
      output: {
        visits: result.items,
        hasMore: result.nextPageUrl !== null
      },
      message: `Retrieved **${result.items.length}** visit(s)${ctx.input.leadId ? ` for lead ${ctx.input.leadId}` : ''} between ${ctx.input.startDate} and ${ctx.input.endDate}.${result.nextPageUrl ? ' More results available.' : ''}`
    };
  })
  .build();
