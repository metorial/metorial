import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReportingClient } from '../lib/client';
import { resolveReportingConfig } from '../lib/context';
import { spec } from '../spec';

export let getCustomerJourney = SlateTool.create(spec, {
  name: 'Get Customer Journey',
  key: 'get_customer_journey',
  description: `Retrieves the full customer journey for contacts within a report, including page view events, tags, orders, subscriptions, and list memberships.
Provides detailed attribution data such as UTM parameters, referrer URLs, ad IDs, and geographic information for each touchpoint.
Use the **extend** parameter to include additional data dimensions.`,
  instructions: [
    'Use ISO-8601 dates or relative dates such as -30 day and now.',
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
      reportId: z
        .string()
        .optional()
        .describe(
          'Optional saved report ID. Omit to use the report type without a saved report.'
        ),
      start: z.string().optional().describe('Start date: ISO-8601 or relative date.'),
      end: z.string().optional().describe('End date: ISO-8601 or relative date.'),
      extend: z
        .array(z.enum(['events', 'tags', 'orders', 'subscriptions', 'lists']))
        .optional()
        .describe('Additional data dimensions to include with each contact.'),
      page: z.number().optional().describe('Page number for pagination, starting at 1.'),
      limit: z.number().optional().describe('Records per page, from 1 to 100 (default 20).')
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
    let client = new ReportingClient(resolveReportingConfig(ctx));

    let result = await client.getReportContacts({
      reportType: ctx.input.reportType,
      reportId: ctx.input.reportId,
      start: ctx.input.start,
      end: ctx.input.end,
      extend: ctx.input.extend,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: {
        contacts: result
      },
      message: `Retrieved customer journey data for **${ctx.input.reportType}** report **${ctx.input.reportId || 'default'}**${ctx.input.page ? ` (page ${ctx.input.page})` : ''}.`
    };
  })
  .build();
