import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let createIncident = SlateTool.create(spec, {
  name: 'Create Incident',
  key: 'create_incident',
  description: `Create a new incident in OpsGenie. Incidents are higher-severity events that may impact services and require coordinated response. Only available on Standard and Enterprise plans.`,
  constraints: [
    'Requires Standard or Enterprise plan.',
    'Message is limited to 130 characters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      message: z.string().describe('Incident message (max 130 characters)'),
      description: z.string().optional().describe('Detailed description of the incident'),
      responders: z
        .array(
          z.object({
            type: z.enum(['team', 'user']).describe('Responder type'),
            id: z.string().optional().describe('Responder ID')
          })
        )
        .optional()
        .describe('Teams or users to notify about the incident'),
      tags: z.array(z.string()).optional().describe('Tags for the incident'),
      details: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value properties'),
      priority: z
        .enum(['P1', 'P2', 'P3', 'P4', 'P5'])
        .optional()
        .describe('Incident priority (default P3)'),
      note: z.string().optional().describe('Note to add to the incident'),
      impactedServiceIds: z
        .array(z.string())
        .optional()
        .describe('IDs of services impacted by this incident'),
      statusPageTitle: z.string().optional().describe('Title for the status page entry'),
      statusPageDetail: z
        .string()
        .optional()
        .describe('Detail text for the status page entry'),
      notifyStakeholders: z
        .boolean()
        .optional()
        .describe('Whether to send stakeholder notifications')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the async processing status'),
      result: z.string().describe('Result message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let data: any = {
      message: ctx.input.message,
      description: ctx.input.description,
      responders: ctx.input.responders,
      tags: ctx.input.tags,
      details: ctx.input.details,
      priority: ctx.input.priority,
      note: ctx.input.note,
      notifyStakeholders: ctx.input.notifyStakeholders
    };

    if (ctx.input.impactedServiceIds) {
      data.impactedServices = ctx.input.impactedServiceIds.map((id: string) => ({ id }));
    }

    if (ctx.input.statusPageTitle || ctx.input.statusPageDetail) {
      data.statusPageEntry = {
        title: ctx.input.statusPageTitle ?? ctx.input.message,
        detail: ctx.input.statusPageDetail ?? ''
      };
    }

    let response = await client.createIncident(data);

    return {
      output: {
        requestId: response.requestId,
        result: response.result ?? 'Request will be processed'
      },
      message: `Created incident: **${ctx.input.message}**${ctx.input.priority ? ` (${ctx.input.priority})` : ''}`
    };
  })
  .build();
