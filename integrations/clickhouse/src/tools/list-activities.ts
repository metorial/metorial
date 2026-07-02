import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

export let listActivities = SlateTool.create(spec, {
  name: 'List Activities',
  key: 'list_activities',
  description: `Retrieve the audit log of organization activities. Optionally filter by date range to see who performed what actions and when.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z
        .string()
        .optional()
        .describe('Start date for filtering activities (ISO-8601 format)'),
      toDate: z
        .string()
        .optional()
        .describe('End date for filtering activities (ISO-8601 format)')
    })
  )
  .output(
    z.object({
      activities: z.array(
        z.object({
          activityId: z.string().describe('Unique identifier of the activity'),
          createdAt: z.string().optional().describe('When the activity occurred'),
          type: z
            .string()
            .optional()
            .describe('Type of activity (e.g., create_organization, create_service)'),
          actorType: z.string().optional().describe('Whether the actor was a user or service'),
          actorId: z.string().optional().describe('ID of the actor who performed the action'),
          actorDetails: z.string().optional().describe('Additional details about the actor'),
          actorIpAddress: z.string().optional().describe('IP address of the actor'),
          organizationId: z.string().optional(),
          serviceId: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let activities = await client.listActivities({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate
    });

    let items = Array.isArray(activities) ? activities : [];

    return {
      output: {
        activities: items.map((a: any) => ({
          activityId: a.id,
          createdAt: a.createdAt,
          type: a.type,
          actorType: a.actorType,
          actorId: a.actorId,
          actorDetails: a.actorDetails,
          actorIpAddress: a.actorIpAddress,
          organizationId: a.organizationId,
          serviceId: a.serviceId
        }))
      },
      message: `Found **${items.length}** activities.`
    };
  })
  .build();
