import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

export let getLeads = SlateTool.create(spec, {
  name: 'Get Leads',
  key: 'get_leads',
  description: `Retrieve identified company leads that visited your website within a date range. Returns company details including name, industry, website, employee count, revenue, location, social profiles, quality score, and visit count. Optionally filter by a custom feed.`,
  instructions: [
    'Dates must be in yyyy-mm-dd format.',
    'If no accountId is provided, the configured or first available account will be used.'
  ],
  constraints: [
    'Results are capped at 10,000 leads total.',
    'Page size is limited to 100 items per request.'
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
      startDate: z.string().describe('Start date in yyyy-mm-dd format'),
      endDate: z.string().describe('End date in yyyy-mm-dd format'),
      customFeedId: z
        .string()
        .optional()
        .describe('Filter leads by a specific custom feed ID'),
      pageNumber: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Results per page, 1-100 (default: 100)')
    })
  )
  .output(
    z.object({
      leads: z.array(
        z.object({
          leadId: z.string(),
          name: z.string(),
          industry: z.string(),
          industries: z.array(z.string()),
          firstVisitDate: z.string(),
          lastVisitDate: z.string(),
          status: z.string(),
          websiteUrl: z.string(),
          phone: z.string(),
          linkedinUrl: z.string(),
          twitterHandle: z.string(),
          facebookUrl: z.string(),
          employeeCount: z.number(),
          employeesRange: z.object({ min: z.number(), max: z.number() }).nullable(),
          crmLeadId: z.string(),
          crmOrganizationId: z.string(),
          tags: z.array(z.string()),
          logoUrl: z.string(),
          assignee: z.string(),
          businessId: z.string(),
          revenue: z.string(),
          visits: z.number(),
          quality: z.number(),
          viewInLeadfeeder: z.string(),
          location: z
            .object({
              country: z.string(),
              countryCode: z.string(),
              region: z.string(),
              regionCode: z.string(),
              city: z.string(),
              stateCode: z.string()
            })
            .nullable()
        })
      ),
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

    let result = await client.getLeads(accountId, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      customFeedId: ctx.input.customFeedId,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        leads: result.items,
        hasMore: result.nextPageUrl !== null
      },
      message: `Retrieved **${result.items.length}** lead(s) for date range ${ctx.input.startDate} to ${ctx.input.endDate}.${result.nextPageUrl ? ' More results available on the next page.' : ''}`
    };
  })
  .build();
