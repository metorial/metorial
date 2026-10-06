import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { spec } from '../spec';

export let getCampaignReport = SlateTool.create(spec, {
  name: 'Get Campaign Report',
  key: 'get_campaign_report',
  description: `Retrieve performance reports for a sent campaign. Get aggregate summary metrics (opens, clicks, bounces, complaints, unsubscribes), per-link click data, or contact-level interaction reports filtered by status.`,
  instructions: [
    'Use reportType "summary" for aggregate metrics, "links" for per-link click data, or "contacts" for contact-level reports filtered by contactStatus.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum results per page, 1–100; not used for summary or links reports'),
      campaignId: z.string().describe('ID of the campaign to get reports for'),
      reportType: z
        .enum(['summary', 'links', 'contacts'])
        .describe('Type of report to retrieve'),
      contactStatus: z
        .enum([
          'bounced',
          'clicked',
          'complained',
          'opened',
          'sent',
          'unsubscribed',
          'not-opened',
          'not-clicked'
        ])
        .optional()
        .describe(
          'Contact interaction status filter. Required when reportType is "contacts".'
        ),
      startingAfter: z
        .string()
        .optional()
        .describe(
          'Cursor for contact reports; links reports are unpaged and ignore this legacy input'
        )
    })
  )
  .output(
    z.object({
      summary: z
        .object({
          campaignId: z.string(),
          sent: z.number(),
          bounced: z.object({ hard: z.number(), soft: z.number() }),
          opened: z.object({ total: z.number(), unique: z.number() }),
          clicked: z.object({ total: z.number(), unique: z.number() }),
          complained: z.number(),
          unsubscribed: z.number()
        })
        .optional()
        .describe('Summary metrics (returned for summary reportType)'),
      links: z
        .array(
          z.object({
            url: z.string(),
            clickedTotal: z.number(),
            clickedUnique: z.number()
          })
        )
        .optional()
        .describe('Per-link click data (returned for links reportType)'),
      contacts: z
        .array(
          z.object({
            contact: z.object({
              contactId: z.string(),
              emailAddress: z.string().optional(),
              fields: z.record(z.string(), z.string()).optional(),
              fieldValues: z
                .record(z.string(), z.union([z.string(), z.number(), z.null()]))
                .nullable()
                .optional(),
              tags: z.array(z.string()).optional(),
              status: z.string().optional(),
              createdAt: z.string().optional(),
              lastUpdatedAt: z.string().optional()
            }),
            occurredAt: z.string().optional(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe(
          'Contact references and event times. The current API does not supply full contact metadata in these reports'
        ),
      pagingNext: z.string().nullable().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { campaignId, reportType, contactStatus, startingAfter } = ctx.input;

    if (reportType === 'summary') {
      let summary = await client.getCampaignSummaryReport(campaignId);
      return {
        output: { summary },
        message: `Campaign sent to ${summary.sent} contacts: ${summary.opened.unique} unique opens, ${summary.clicked.unique} unique clicks, ${summary.bounced.hard + summary.bounced.soft} bounces, ${summary.complained} complaints, ${summary.unsubscribed} unsubscribes.`
      };
    }

    if (reportType === 'links') {
      let result = await client.getCampaignLinkReports(campaignId, startingAfter);
      return {
        output: { links: result.data, pagingNext: result.pagingNext },
        message: `Retrieved ${result.data.length} link report(s).`
      };
    }

    if (reportType === 'contacts') {
      if (!contactStatus)
        throw invalid('contactStatus is required when reportType is "contacts".');
      let result = await client.getCampaignContactReports(
        campaignId,
        contactStatus,
        startingAfter,
        ctx.input.limit
      );
      return {
        output: { contacts: result.data, pagingNext: result.pagingNext },
        message: `Retrieved ${result.data.length} contact(s) with status "${contactStatus}".`
      };
    }

    throw invalid(`Unknown reportType: ${reportType}`);
  })
  .build();
