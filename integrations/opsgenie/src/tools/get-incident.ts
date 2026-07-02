import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let getIncident = SlateTool.create(spec, {
  name: 'Get Incident',
  key: 'get_incident',
  description: `Retrieve detailed information about a specific incident. Only available on Standard and Enterprise plans.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      incidentIdentifier: z.string().describe('Incident ID or tiny ID'),
      identifierType: z
        .enum(['id', 'tiny'])
        .optional()
        .describe('Type of identifier provided. Defaults to "id"')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Unique incident ID'),
      tinyId: z.string().optional().describe('Short numeric incident ID'),
      message: z.string().describe('Incident message'),
      status: z.string().describe('Incident status'),
      tags: z.array(z.string()).describe('Incident tags'),
      createdAt: z.string().describe('Creation time'),
      updatedAt: z.string().describe('Last update time'),
      priority: z.string().describe('Incident priority'),
      ownerTeam: z.string().optional().describe('Name of the owning team'),
      responders: z
        .array(
          z.object({
            type: z.string().describe('Responder type'),
            id: z.string().optional().describe('Responder ID')
          })
        )
        .optional()
        .describe('Incident responders'),
      impactedServices: z.array(z.string()).optional().describe('IDs of impacted services'),
      description: z.string().optional().describe('Incident description'),
      details: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let incident = await client.getIncident(
      ctx.input.incidentIdentifier,
      ctx.input.identifierType ?? 'id'
    );

    return {
      output: {
        incidentId: incident.id,
        tinyId: incident.tinyId,
        message: incident.message,
        status: incident.status,
        tags: incident.tags ?? [],
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,
        priority: incident.priority,
        ownerTeam: incident.ownerTeam?.name,
        responders: incident.responders,
        impactedServices: (incident.impactedServices ?? []).map((s: any) => s.id),
        description: incident.description,
        details: incident.details
      },
      message: `Incident **${incident.message}** — status: ${incident.status}, priority: ${incident.priority}`
    };
  })
  .build();
