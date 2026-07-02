import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateIncident = SlateTool.create(spec, {
  name: 'Update Incident',
  key: 'update_incident',
  description: `Update an existing incident's status, message, impact, or associated components. Each update creates a new entry in the incident timeline. Use this to progress an incident through its lifecycle (investigating -> identified -> monitoring -> resolved) or to delete it.`,
  instructions: [
    'Updating the status automatically creates a new incident update entry visible on the status page.',
    'Set delete to true to remove the incident entirely.'
  ]
})
  .input(
    z.object({
      incidentId: z.string().describe('ID of the incident to update'),
      status: z
        .enum(['investigating', 'identified', 'monitoring', 'resolved'])
        .optional()
        .describe('New status for the incident'),
      message: z
        .string()
        .optional()
        .describe('Update message body to add to the incident timeline'),
      impactOverride: z
        .enum(['none', 'minor', 'major', 'critical'])
        .optional()
        .describe('Override the calculated impact level'),
      componentIds: z
        .record(z.string(), z.string())
        .optional()
        .describe('Map of component IDs to their updated status'),
      notifySubscribers: z
        .boolean()
        .optional()
        .describe('Whether to send notifications for this update'),
      delete: z.boolean().optional().describe('Set to true to delete the incident')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Unique identifier of the incident'),
      name: z.string().optional().describe('Title of the incident'),
      status: z.string().optional().describe('Current status of the incident'),
      impact: z.string().optional().describe('Impact level'),
      resolvedAt: z
        .string()
        .optional()
        .nullable()
        .describe('Resolution timestamp, if resolved'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the incident was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });

    if (ctx.input.delete) {
      await client.deleteIncident(ctx.input.incidentId);
      return {
        output: { incidentId: ctx.input.incidentId, deleted: true },
        message: `Deleted incident \`${ctx.input.incidentId}\`.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.status !== undefined) data.status = ctx.input.status;
    if (ctx.input.message !== undefined) data.body = ctx.input.message;
    if (ctx.input.impactOverride !== undefined)
      data.impact_override = ctx.input.impactOverride;
    if (ctx.input.notifySubscribers !== undefined)
      data.deliver_notifications = ctx.input.notifySubscribers;

    if (ctx.input.componentIds) {
      data.component_ids = Object.keys(ctx.input.componentIds);
      data.components = ctx.input.componentIds;
    }

    let incident = await client.updateIncident(ctx.input.incidentId, data);

    return {
      output: {
        incidentId: incident.id,
        name: incident.name,
        status: incident.status,
        impact: incident.impact,
        resolvedAt: incident.resolved_at,
        updatedAt: incident.updated_at
      },
      message: `Updated incident **${incident.name}** to status \`${incident.status}\`.`
    };
  })
  .build();
