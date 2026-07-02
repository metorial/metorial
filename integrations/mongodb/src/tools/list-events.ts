import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { mongodbServiceError } from '../lib/errors';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.string().describe('Unique identifier of the event'),
  eventTypeName: z.string().describe('Type of event'),
  created: z.string().describe('ISO 8601 timestamp when the event occurred'),
  groupId: z.string().optional().describe('Project ID associated with the event'),
  orgId: z.string().optional().describe('Organization ID associated with the event'),
  userId: z.string().optional().describe('User who triggered the event'),
  username: z.string().optional().describe('Username who triggered the event'),
  clusterName: z.string().optional().describe('Cluster associated with the event'),
  targetUsername: z.string().optional().describe('Target user of the event'),
  remoteAddress: z.string().optional().describe('IP address of the event source'),
  isGlobalAdmin: z
    .boolean()
    .optional()
    .describe('Whether the event was triggered by a global admin')
});

export let listEventsTool = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List activity feed events for a MongoDB Atlas project or organization. Events include configuration changes, user actions, cluster state changes, and system events. Useful for auditing and monitoring activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['project', 'organization'])
        .describe('Whether to list project or organization events'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID (for project scope). Falls back to configured projectId.'),
      organizationId: z
        .string()
        .optional()
        .describe(
          'Organization ID (for organization scope). Falls back to configured organizationId.'
        ),
      eventType: z.array(z.string()).optional().describe('Filter by event type names'),
      minDate: z.string().optional().describe('ISO 8601 minimum date filter'),
      maxDate: z.string().optional().describe('ISO 8601 maximum date filter'),
      itemsPerPage: z.number().optional().describe('Number of results per page'),
      pageNum: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).describe('List of events'),
      totalCount: z.number().describe('Total number of events matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AtlasClient(ctx.auth);

    let params: any = {
      itemsPerPage: ctx.input.itemsPerPage,
      pageNum: ctx.input.pageNum
    };
    if (ctx.input.eventType) params.eventType = ctx.input.eventType;
    if (ctx.input.minDate) params.minDate = ctx.input.minDate;
    if (ctx.input.maxDate) params.maxDate = ctx.input.maxDate;

    let result: any;
    if (ctx.input.scope === 'project') {
      let projectId = ctx.input.projectId || ctx.config.projectId;
      if (!projectId) throw mongodbServiceError('projectId is required for project scope');
      result = await client.listProjectEvents(projectId, params);
    } else {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId)
        throw mongodbServiceError('organizationId is required for organization scope');
      result = await client.listOrganizationEvents(orgId, params);
    }

    let events = (result.results || []).map((e: any) => ({
      eventId: e.id,
      eventTypeName: e.eventTypeName,
      created: e.created,
      groupId: e.groupId,
      orgId: e.orgId,
      userId: e.userId,
      username: e.username,
      clusterName: e.clusterName,
      targetUsername: e.targetUsername,
      remoteAddress: e.remoteAddress,
      isGlobalAdmin: e.isGlobalAdmin
    }));

    return {
      output: {
        events,
        totalCount: result.totalCount ?? events.length
      },
      message: `Found **${events.length}** event(s).`
    };
  })
  .build();
