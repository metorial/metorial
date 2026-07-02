import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReportingClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomerJourney = SlateTool.create(spec, {
  name: 'Get Customer Journey',
  key: 'get_customer_journey',
  description: `Retrieves the full customer journey for contacts within a report, including page view events, tags, orders, subscriptions, and list memberships.
Provides detailed attribution data such as UTM parameters, referrer URLs, ad IDs, and geographic information for each touchpoint.
Use the **extend** parameter to include additional data dimensions.`,
  instructions: [
    'Use date format YYYY-MM-DD for start and end dates.',
    'Use extend to request additional data: events, tags, orders, subscriptions, lists.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['leads', 'revenue', 'ads', 'subscriptions'])
        .describe('Type of report.'),
      reportId: z.string().describe('ID of the saved report.'),
      start: z.string().optional().describe('Start date (YYYY-MM-DD).'),
      end: z.string().optional().describe('End date (YYYY-MM-DD).'),
      extend: z
        .array(z.enum(['events', 'tags', 'orders', 'subscriptions', 'lists']))
        .optional()
        .describe('Additional data dimensions to include with each contact.'),
      page: z.number().optional().describe('Page number for pagination.')
    })
  )
  .output(
    z.object({
      contacts: z
        .unknown()
        .describe('Contact journey data including attribution touchpoints and extended data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReportingClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.getReportContacts({
      reportType: ctx.input.reportType,
      reportId: ctx.input.reportId,
      start: ctx.input.start,
      end: ctx.input.end,
      extend: ctx.input.extend,
      page: ctx.input.page
    });

    return {
      output: {
        contacts: result
      },
      message: `Retrieved customer journey data for **${ctx.input.reportType}** report **${ctx.input.reportId}**${ctx.input.page ? ` (page ${ctx.input.page})` : ''}.`
    };
  })
  .build();
