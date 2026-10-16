import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let insightSchema = z.object({
  guid: z.string().optional().describe('MX-assigned unique identifier'),
  userGuid: z.string().optional().describe('GUID of the owning user'),
  title: z.string().optional().nullable().describe('Insight title'),
  template: z.string().optional().nullable().describe('MX insight template'),
  activeAt: z.string().optional().nullable().describe('Time when the insight becomes active'),
  isDismissed: z.boolean().optional().nullable().describe('Whether the insight is dismissed'),
  hasBeenDisplayed: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether the insight has been displayed'),
  description: z.string().optional().nullable().describe('Insight description'),
  insightType: z.string().optional().nullable().describe('Type of insight'),
  isRead: z.boolean().optional().nullable().describe('Whether the insight has been read'),
  hasFired: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether the insight has been triggered'),
  createdAt: z.string().optional().nullable().describe('Creation timestamp'),
  updatedAt: z.string().optional().nullable().describe('Last update timestamp')
});

export let listInsights = SlateTool.create(spec, {
  name: 'List Insights',
  key: 'list_insights',
  description: `List financial insights generated for a user. Insights analyze user financial data to provide actionable recommendations such as unusual spending alerts, bill reminders, and saving opportunities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      page: z.number().optional().describe('Page number'),
      recordsPerPage: z.number().optional().describe('Records per page (max: 100)')
    })
  )
  .output(
    z.object({
      insights: z.array(insightSchema),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          perPage: z.number().optional(),
          totalEntries: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let result = await client.listInsights(ctx.input.userGuid, {
      page: ctx.input.page,
      recordsPerPage: ctx.input.recordsPerPage
    });

    let insights = (result.insights || []).map((i: any) => ({
      guid: i.guid ?? undefined,
      userGuid: i.user_guid ?? undefined,
      title: i.title,
      template: i.template,
      activeAt: i.active_at,
      isDismissed: i.is_dismissed,
      hasBeenDisplayed: i.has_been_displayed,
      description: i.description,
      insightType: i.insight_type,
      isRead: i.is_read,
      hasFired: i.has_fired,
      createdAt: i.created_at,
      updatedAt: i.updated_at
    }));

    return {
      output: {
        insights,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${insights.length}** insights for user ${ctx.input.userGuid}.`
    };
  })
  .build();
