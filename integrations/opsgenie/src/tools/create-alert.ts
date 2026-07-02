import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

let responderSchema = z
  .object({
    type: z.enum(['team', 'user', 'escalation', 'schedule']).describe('Responder type'),
    id: z.string().optional().describe('Responder ID'),
    username: z.string().optional().describe('Username (for user type)'),
    name: z.string().optional().describe('Name (for team, escalation, schedule types)')
  })
  .describe('Responder to notify');

export let createAlert = SlateTool.create(spec, {
  name: 'Create Alert',
  key: 'create_alert',
  description: `Create a new alert in OpsGenie. Alerts are processed asynchronously — the returned requestId can be used to track processing status. Supports setting priority, responders, tags, custom details, and more.`,
  instructions: [
    'Provide at least a message. All other fields are optional.',
    'Priority ranges from P1 (critical) to P5 (informational). Default is P3.',
    'Responders can be teams, users, escalations, or schedules. Provide either id, username, or name depending on type.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      message: z.string().describe('Alert message (max 130 characters)'),
      alias: z
        .string()
        .optional()
        .describe('Client-defined unique identifier for the alert, used for deduplication'),
      description: z
        .string()
        .optional()
        .describe('Detailed description of the alert (max 15000 characters)'),
      responders: z
        .array(responderSchema)
        .optional()
        .describe('Teams, users, escalations, or schedules to notify'),
      visibleTo: z
        .array(responderSchema)
        .optional()
        .describe(
          'Teams and users the alert will be visible to without sending notifications'
        ),
      actions: z
        .array(z.string())
        .optional()
        .describe('Custom actions available for the alert'),
      tags: z.array(z.string()).optional().describe('Tags to attach to the alert'),
      details: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value properties for the alert'),
      entity: z
        .string()
        .optional()
        .describe('Entity the alert is related to (e.g., server name)'),
      source: z.string().optional().describe('Source of the alert'),
      priority: z
        .enum(['P1', 'P2', 'P3', 'P4', 'P5'])
        .optional()
        .describe('Alert priority level'),
      user: z.string().optional().describe('Display name of the request owner'),
      note: z.string().optional().describe('Additional note for the alert')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the async processing status of the request'),
      result: z.string().describe('Result message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.createAlert({
      message: ctx.input.message,
      alias: ctx.input.alias,
      description: ctx.input.description,
      responders: ctx.input.responders as any,
      visibleTo: ctx.input.visibleTo as any,
      actions: ctx.input.actions ? [...ctx.input.actions] : undefined,
      tags: ctx.input.tags ? [...ctx.input.tags] : undefined,
      details: ctx.input.details ? { ...ctx.input.details } : undefined,
      entity: ctx.input.entity,
      source: ctx.input.source,
      priority: ctx.input.priority,
      user: ctx.input.user,
      note: ctx.input.note
    });

    return {
      output: {
        requestId: response.requestId,
        result: response.result ?? 'Request will be processed'
      },
      message: `Created alert: **${ctx.input.message}**${ctx.input.priority ? ` (${ctx.input.priority})` : ''}`
    };
  })
  .build();
