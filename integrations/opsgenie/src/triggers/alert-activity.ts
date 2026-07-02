import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let alertActivityTrigger = SlateTrigger.create(spec, {
  name: 'Alert Activity',
  key: 'alert_activity',
  description:
    'Triggered when alert activity occurs in OpsGenie via a configured Webhook integration. Fires on alert create, acknowledge, close, delete, add note, assign ownership, and custom actions.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe(
          'The alert action that occurred (e.g., Create, Acknowledge, Close, Delete, AddNote, AssignOwnership)'
        ),
      alertId: z.string().describe('The alert ID'),
      message: z.string().optional().describe('Alert message'),
      alias: z.string().optional().describe('Alert alias'),
      tinyId: z.string().optional().describe('Short numeric alert ID'),
      entity: z.string().optional().describe('Entity the alert is related to'),
      username: z.string().optional().describe('Username who triggered the action'),
      userId: z.string().optional().describe('User ID who triggered the action'),
      description: z
        .string()
        .optional()
        .describe('Alert description (only for Create and Custom actions)'),
      details: z
        .record(z.string(), z.string())
        .optional()
        .describe('Alert details (only for Create and Custom actions)'),
      source: z.string().optional().describe('Source integration name'),
      sourceType: z.string().optional().describe('Source integration type'),
      tags: z.array(z.string()).optional().describe('Alert tags'),
      priority: z.string().optional().describe('Alert priority')
    })
  )
  .output(
    z.object({
      alertId: z.string().describe('The alert ID'),
      action: z.string().describe('The action performed on the alert'),
      message: z.string().optional().describe('Alert message'),
      alias: z.string().optional().describe('Alert alias'),
      tinyId: z.string().optional().describe('Short numeric alert ID'),
      entity: z.string().optional().describe('Entity related to the alert'),
      username: z.string().optional().describe('Username who triggered the action'),
      userId: z.string().optional().describe('User ID who triggered the action'),
      description: z.string().optional().describe('Alert description'),
      details: z.record(z.string(), z.string()).optional().describe('Custom alert details'),
      source: z.string().optional().describe('Source integration name'),
      sourceType: z.string().optional().describe('Source integration type'),
      tags: z.array(z.string()).optional().describe('Alert tags'),
      priority: z.string().optional().describe('Alert priority')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.alert) {
        return { inputs: [] };
      }

      let alert = data.alert ?? {};
      let action = data.action ?? 'Unknown';

      return {
        inputs: [
          {
            action,
            alertId: alert.alertId ?? alert.id ?? '',
            message: alert.message,
            alias: alert.alias,
            tinyId: alert.tinyId,
            entity: alert.entity,
            username: alert.username ?? data.username,
            userId: alert.userId ?? data.userId,
            description: alert.description,
            details: alert.details,
            source: data.source?.name,
            sourceType: data.source?.type,
            tags: alert.tags,
            priority: alert.priority
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let actionLower = (ctx.input.action ?? 'unknown').toLowerCase().replace(/\s+/g, '_');

      return {
        type: `alert.${actionLower}`,
        id: `${ctx.input.alertId}-${ctx.input.action}-${Date.now()}`,
        output: {
          alertId: ctx.input.alertId,
          action: ctx.input.action,
          message: ctx.input.message,
          alias: ctx.input.alias,
          tinyId: ctx.input.tinyId,
          entity: ctx.input.entity,
          username: ctx.input.username,
          userId: ctx.input.userId,
          description: ctx.input.description,
          details: ctx.input.details,
          source: ctx.input.source,
          sourceType: ctx.input.sourceType,
          tags: ctx.input.tags,
          priority: ctx.input.priority
        }
      };
    }
  })
  .build();
