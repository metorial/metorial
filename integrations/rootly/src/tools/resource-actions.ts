import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResource, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

const details = z.record(z.string(), z.any());
export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Inspect the current user associated with the API connection, including its identifier and profile.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ user: details }))
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).getCurrentUser();
    return {
      output: { user: flattenResource(result.data as JsonApiResource) },
      message: 'Retrieved the current Rootly user.'
    };
  })
  .build();

export const getAlert = SlateTool.create(spec, {
  name: 'Get Alert',
  key: 'get_alert',
  description:
    'Read the current state and details of an alert. Call list_alerts to discover alert identifiers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      alertId: z.string().describe('Alert ID returned by list_alerts or create_alert'),
      include: z.string().optional().describe('Comma-separated related resources to include')
    })
  )
  .output(z.object({ alert: details, included: z.array(details).optional() }))
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).getAlert(
      ctx.input.alertId,
      ctx.input.include
    );
    return {
      output: {
        alert: flattenResource(result.data as JsonApiResource),
        included: result.included?.map(flattenResource)
      },
      message: 'Retrieved the alert.'
    };
  })
  .build();

export const deleteIncident = SlateTool.create(spec, {
  name: 'Delete Incident',
  key: 'delete_incident',
  description:
    'Permanently delete an incident and its incident record. Call list_incidents or get_incident to verify the target before deletion.',
  tags: { destructive: true }
})
  .input(
    z.object({ incidentId: z.string().describe('Incident ID or slug to permanently delete') })
  )
  .output(z.object({ incidentId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).deleteIncident(
      ctx.input.incidentId
    );
    const incident = flattenResource(result.data as JsonApiResource);
    return {
      output: { incidentId: String(incident.id), deleted: true },
      message: 'Deleted the incident.'
    };
  })
  .build();

export const getActionItem = SlateTool.create(spec, {
  name: 'Get Action Item',
  key: 'get_action_item',
  description:
    'Read an incident action item by its identifier. Call list_action_items to discover identifiers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      actionItemId: z
        .string()
        .describe('Action item ID returned by list_action_items or create_action_item')
    })
  )
  .output(z.object({ actionItem: details }))
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).getActionItem(
      ctx.input.actionItemId
    );
    return {
      output: { actionItem: flattenResource(result.data as JsonApiResource) },
      message: 'Retrieved the action item.'
    };
  })
  .build();

export const deleteActionItem = SlateTool.create(spec, {
  name: 'Delete Action Item',
  key: 'delete_action_item',
  description:
    'Permanently delete an incident action item. Verify its identifier with get_action_item or list_action_items first.',
  tags: { destructive: true }
})
  .input(
    z.object({ actionItemId: z.string().describe('Action item ID to permanently delete') })
  )
  .output(z.object({ actionItemId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).deleteActionItem(
      ctx.input.actionItemId
    );
    const item = flattenResource(result.data as JsonApiResource);
    return {
      output: { actionItemId: String(item.id), deleted: true },
      message: 'Deleted the action item.'
    };
  })
  .build();

export const manageHeartbeat = SlateTool.create(spec, {
  name: 'Manage Heartbeat',
  key: 'manage_heartbeat',
  description:
    'Read, update or delete a heartbeat monitor. Use enabled=false to disable missed-ping alerts. Deletion permanently removes the monitor. Call list_heartbeats to discover identifiers.',
  tags: { destructive: true }
})
  .input(
    z.object({
      heartbeatId: z
        .string()
        .describe('Heartbeat ID returned by list_heartbeats or create_heartbeat'),
      action: z
        .enum(['get', 'update', 'delete'])
        .describe('Operation on the selected monitor'),
      name: z.string().optional().describe('Updated name; update only'),
      description: z.string().optional().describe('Updated description; update only'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether missed pings trigger alerts; update only'),
      interval: z.number().optional().describe('Positive ping interval; update only'),
      intervalUnit: z
        .enum(['minutes', 'hours', 'days'])
        .optional()
        .describe('Ping interval unit; update only'),
      notificationTargetType: z
        .enum(['User', 'Group', 'EscalationPolicy', 'Service'])
        .optional()
        .describe('Notification target type; update only'),
      notificationTargetId: z
        .string()
        .optional()
        .describe('Notification target identifier; update only'),
      alertSummary: z
        .string()
        .optional()
        .describe('Summary for missed-ping alerts; update only'),
      alertUrgencyId: z.string().optional().describe('Alert urgency identifier; update only')
    })
  )
  .output(
    z.object({ heartbeatId: z.string(), heartbeat: details.optional(), deleted: z.boolean() })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const { heartbeatId, action, ...attributes } = ctx.input;
    if (action !== 'update' && Object.values(attributes).some(value => value !== undefined))
      throw createApiServiceError('Heartbeat settings apply only to the update action.');
    const result =
      action === 'get'
        ? await client.getHeartbeat(heartbeatId)
        : action === 'delete'
          ? await client.deleteHeartbeat(heartbeatId)
          : await client.updateHeartbeat(heartbeatId, attributes);
    const heartbeat = flattenResource(result.data as JsonApiResource);
    return {
      output: {
        heartbeatId: String(heartbeat.id),
        heartbeat: action === 'delete' ? undefined : heartbeat,
        deleted: action === 'delete'
      },
      message:
        action === 'delete'
          ? 'Deleted the heartbeat monitor.'
          : action === 'update'
            ? 'Updated the heartbeat monitor.'
            : 'Retrieved the heartbeat monitor.'
    };
  })
  .build();
