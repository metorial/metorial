import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type DripRecord } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

const metricShape = z.object({
  sends: z.number().optional(),
  deliveries: z.number().optional(),
  opens: z.number().optional(),
  openRate: z.number().optional(),
  clicks: z.number().optional(),
  clickRate: z.number().optional(),
  botClicks: z.number().optional(),
  botClickRate: z.number().optional(),
  unsubscribes: z.number().optional(),
  unsubscribeRate: z.number().optional(),
  hardBounces: z.number().optional(),
  hardBounceRate: z.number().optional(),
  complaints: z.number().optional(),
  complaintRate: z.number().optional(),
  orders: z.number().optional(),
  orderRate: z.number().optional(),
  revenueInCents: z.number().optional(),
  revenuePerPersonInCents: z.number().optional(),
  averageOrderValueInCents: z.number().optional()
});

const num = (value: unknown) => (typeof value === 'number' ? value : undefined);
const mapMetric = (m: DripRecord | undefined) => ({
  sends: num(m?.sends),
  deliveries: num(m?.deliveries),
  opens: num(m?.opens),
  openRate: num(m?.open_rate),
  clicks: num(m?.clicks),
  clickRate: num(m?.click_rate),
  botClicks: num(m?.bot_clicks),
  botClickRate: num(m?.bot_click_rate),
  unsubscribes: num(m?.unsubscribes),
  unsubscribeRate: num(m?.unsubscribe_rate),
  hardBounces: num(m?.hard_bounces),
  hardBounceRate: num(m?.hard_bounce_rate),
  complaints: num(m?.complaints),
  complaintRate: num(m?.complaint_rate),
  orders: num(m?.orders),
  orderRate: num(m?.order_rate),
  revenueInCents: num(m?.revenue_in_cents),
  revenuePerPersonInCents: num(m?.revenue_per_person_in_cents),
  averageOrderValueInCents: num(m?.average_order_value_in_cents)
});
const optionalString = (value: unknown) =>
  value === undefined || value === null ? undefined : String(value);

export const getEmailMetrics = SlateTool.create(spec, {
  name: 'Get Email Metrics',
  key: 'get_email_metrics',
  description:
    'Report email performance (sends, deliveries, opens, clicks, unsubscribes, bounces, complaints, orders and revenue) for broadcasts and workflow emails over a date range, as a total plus per-email rows.',
  instructions: [
    'Dates are YYYY-MM-DD in the account owner’s time zone; the range defaults to the last 30 days and may not exceed 366 days.',
    'Filter by broadcastIds and/or workflowIds (results are the union). Email-series campaign and rule emails appear only in unfiltered reports.',
    'Drip allows 20 metrics reports per account per hour.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      startDate: z
        .string()
        .optional()
        .describe('First day (inclusive), YYYY-MM-DD. Defaults to 30 days ago.'),
      endDate: z
        .string()
        .optional()
        .describe('Last day (inclusive), YYYY-MM-DD. Defaults to today.'),
      broadcastIds: z
        .array(z.string())
        .optional()
        .describe('Limit to emails sent by these broadcasts (from list_broadcasts).'),
      workflowIds: z
        .array(z.string())
        .optional()
        .describe('Limit to emails sent by these workflows (max 25).')
    })
  )
  .output(
    z.object({
      summary: metricShape.describe('Totals across every email in the report.'),
      emails: z.array(
        z.object({
          emailId: z.string().optional(),
          broadcastId: z.string().optional(),
          workflowId: z.string().optional(),
          workflowNodeId: z.string().optional(),
          title: z.string().optional().describe('Name of the campaign or automation.'),
          metrics: metricShape
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const { startDate, endDate, broadcastIds, workflowIds } = ctx.input;
    for (const date of [startDate, endDate])
      if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw createApiServiceError('Dates must use the YYYY-MM-DD format.', {
          reason: 'invalid_input'
        });
    if ((workflowIds?.length ?? 0) > 25)
      throw createApiServiceError('Provide at most 25 workflowIds.', {
        reason: 'invalid_input'
      });
    for (const id of [...(broadcastIds ?? []), ...(workflowIds ?? [])])
      if (!id.trim())
        throw createApiServiceError('Broadcast and workflow IDs must be nonempty.', {
          reason: 'invalid_input'
        });

    const client = new Client({
      token: ctx.auth.token,
      accountId: ctx.input.accountId ?? ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });
    const result = await client.fetchEmailMetrics({
      startDate,
      endDate,
      broadcastIds,
      workflowIds
    });
    const emails = result.emails.map((email: DripRecord) => ({
      emailId: optionalString(email.email_id),
      broadcastId: optionalString(email.broadcast_id),
      workflowId: optionalString(email.workflow_placement?.workflow_id),
      workflowNodeId: optionalString(email.workflow_placement?.node_id),
      title: typeof email.title === 'string' ? email.title : undefined,
      metrics: mapMetric(email.email_metric)
    }));
    const summary = mapMetric(result.summary);
    return {
      output: { summary, emails },
      message: `Reported ${emails.length} emails with ${summary.sends ?? 0} total sends.`
    };
  })
  .build();
