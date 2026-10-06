import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/admin-client';
import { spec } from '../spec';

export let getUsageEvents = SlateTool.create(spec, {
  name: 'Get Usage Events',
  key: 'get_usage_events',
  description: `Retrieve detailed usage events for your team with filtering by date range, user, and pagination. Provides granular insights into individual API calls, model usage, token consumption, and costs. Requires an Admin API key.`,
  constraints: ['Poll at most once per hour.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Inclusive start date as epoch milliseconds'),
      endDate: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Inclusive end date as epoch milliseconds'),
      userId: z
        .number()
        .int()
        .optional()
        .describe(
          'Numeric analytics user ID, distinct from encoded team member IDs. Filter by email when using list_team_members.'
        ),
      email: z.string().optional().describe('Filter by user email'),
      page: z.number().int().min(1).optional().describe('Page number (default 1)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Results per page (default 100, maximum 1000)'),
      serviceAccountId: z.string().optional().describe('Filter by service account ID'),
      cloudAgentId: z
        .string()
        .optional()
        .describe('Cloud agent run ID, or * for all cloud runs'),
      automationId: z
        .string()
        .optional()
        .describe('Automation UUID, or * for all automations'),
      hostingType: z
        .enum(['CLOUD', 'SELF_HOSTED', 'SELF_HOSTED_POOL', 'SELF_HOSTED_MACHINE'])
        .optional()
        .describe('Filter by cloud or self-hosted execution')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          timestamp: z.string().describe('Event timestamp (epoch ms as string)'),
          userEmail: z.string().describe('User email'),
          model: z.string().describe('AI model used'),
          kind: z.string().describe('Billing category'),
          isChargeable: z.boolean().describe('Whether the event is chargeable'),
          inputTokens: z
            .number()
            .optional()
            .describe('Input tokens, when token usage is reported'),
          outputTokens: z
            .number()
            .optional()
            .describe('Output tokens, when token usage is reported'),
          chargedCents: z.number().describe('Amount charged in cents'),
          requestsCosts: z.number().optional().describe('Billable request units'),
          cursorTokenFee: z
            .number()
            .optional()
            .describe('Cursor Token Rate in cents when applicable'),
          cloudAgentId: z.string().optional(),
          automationId: z.string().optional(),
          serviceAccountId: z.string().optional()
        })
      ),
      totalCount: z.number().describe('Total number of usage events matching the query'),
      hasNextPage: z.boolean().describe('Whether more pages are available'),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    let result = await client.getUsageEvents({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      userId: ctx.input.userId,
      email: ctx.input.email,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      serviceAccountId: ctx.input.serviceAccountId,
      cloudAgentId: ctx.input.cloudAgentId,
      automationId: ctx.input.automationId,
      hostingType: ctx.input.hostingType
    });

    return {
      output: {
        events: result.usageEvents.map(e => ({
          timestamp: e.timestamp,
          userEmail: e.userEmail,
          model: e.model,
          kind: e.kind,
          isChargeable: e.isChargeable,
          inputTokens: e.tokenUsage?.inputTokens,
          outputTokens: e.tokenUsage?.outputTokens,
          chargedCents: e.chargedCents,
          requestsCosts: e.requestsCosts,
          cursorTokenFee: e.cursorTokenFee,
          cloudAgentId: e.cloudAgentId,
          automationId: e.automationId,
          serviceAccountId: e.serviceAccountId
        })),
        totalCount: result.totalUsageEventsCount,
        hasNextPage: result.pagination.hasNextPage,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.numPages
      },
      message: `Retrieved **${result.usageEvents.length}** event(s) out of ${result.totalUsageEventsCount} total.`
    };
  })
  .build();
