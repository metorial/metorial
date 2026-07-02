import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listEventsTool = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `Retrieve audit events for a MongoDB Atlas project or organization. Track changes like cluster creation/deletion, user modifications, alert triggers, backup events, and other administrative operations.`,
  instructions: [
    'Provide either projectId for project events or organizationId for organization events.',
    'Common event types: CLUSTER_CREATED, CLUSTER_DELETED, USER_CREATED, ALERT_TRIGGERED, BACKUP_SNAPSHOT_CREATED.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Atlas Project ID for project events'),
      organizationId: z
        .string()
        .optional()
        .describe('Atlas Organization ID for organization events'),
      eventTypes: z.array(z.string()).optional().describe('Filter by event types'),
      minDate: z.string().optional().describe('ISO 8601 minimum date filter'),
      maxDate: z.string().optional().describe('ISO 8601 maximum date filter'),
      itemsPerPage: z.number().optional().describe('Number of results per page (max 500)'),
      pageNum: z.number().optional().describe('Page number (1-indexed)')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          eventId: z.string(),
          eventTypeName: z.string(),
          created: z.string(),
          groupId: z.string().optional(),
          orgId: z.string().optional(),
          targetUsername: z.string().optional(),
          clusterName: z.string().optional(),
          hostname: z.string().optional(),
          raw: z.any()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    let orgId = ctx.input.organizationId || ctx.config.organizationId;

    let params = {
      eventType: ctx.input.eventTypes,
      minDate: ctx.input.minDate,
      maxDate: ctx.input.maxDate,
      itemsPerPage: ctx.input.itemsPerPage,
      pageNum: ctx.input.pageNum
    };

    let result: any;
    if (projectId) {
      result = await client.listProjectEvents(projectId, params);
    } else if (orgId) {
      result = await client.listOrganizationEvents(orgId, params);
    } else {
      throw new Error('Either projectId or organizationId is required.');
    }

    let events = (result.results || []).map((e: any) => ({
      eventId: e.id,
      eventTypeName: e.eventTypeName,
      created: e.created,
      groupId: e.groupId,
      orgId: e.orgId,
      targetUsername: e.targetUsername,
      clusterName: e.clusterName,
      hostname: e.hostname,
      raw: e
    }));

    return {
      output: { events, totalCount: result.totalCount || events.length },
      message: `Found **${events.length}** event(s).`
    };
  })
  .build();
