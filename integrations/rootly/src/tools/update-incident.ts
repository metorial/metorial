import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResource, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let updateIncident = SlateTool.create(spec, {
  name: 'Update Incident',
  key: 'update_incident',
  description: `Update an existing incident in Rootly. Change status, severity, title, summary, linked services, or add mitigation/resolution messages.
Use this to transition incidents through their lifecycle (e.g., triage → mitigated → resolved).`,
  instructions: [
    'To resolve an incident, set status to "resolved" and optionally provide a resolutionMessage.',
    'To mitigate an incident, set status to "mitigated" and optionally provide a mitigationMessage.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('Incident ID or slug to update'),
      title: z.string().optional().describe('Updated incident title'),
      summary: z.string().optional().describe('Updated incident summary'),
      status: z
        .enum([
          'in_triage',
          'started',
          'detected',
          'acknowledged',
          'mitigated',
          'resolved',
          'closed',
          'cancelled'
        ])
        .optional()
        .describe('New status'),
      severityId: z.string().optional().describe('New severity ID'),
      isPrivate: z.boolean().optional().describe('Whether the incident is private'),
      serviceIds: z.array(z.string()).optional().describe('Updated affected service IDs'),
      environmentIds: z.array(z.string()).optional().describe('Updated environment IDs'),
      incidentTypeIds: z.array(z.string()).optional().describe('Updated incident type IDs'),
      functionalityIds: z.array(z.string()).optional().describe('Updated functionality IDs'),
      groupIds: z.array(z.string()).optional().describe('Updated team/group IDs'),
      labels: z.record(z.string(), z.string()).optional().describe('Updated key-value labels'),
      mitigationMessage: z
        .string()
        .optional()
        .describe('Mitigation message (set when mitigating)'),
      resolutionMessage: z
        .string()
        .optional()
        .describe('Resolution message (set when resolving)'),
      cancellationMessage: z
        .string()
        .optional()
        .describe('Cancellation message (set when cancelling)')
    })
  )
  .output(
    z.object({
      incident: z.record(z.string(), z.any()).describe('Updated incident details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateIncident(ctx.input.incidentId, {
      title: ctx.input.title,
      summary: ctx.input.summary,
      status: ctx.input.status,
      severityId: ctx.input.severityId,
      private: ctx.input.isPrivate,
      serviceIds: ctx.input.serviceIds,
      environmentIds: ctx.input.environmentIds,
      incidentTypeIds: ctx.input.incidentTypeIds,
      functionalityIds: ctx.input.functionalityIds,
      groupIds: ctx.input.groupIds,
      labels: ctx.input.labels,
      mitigationMessage: ctx.input.mitigationMessage,
      resolutionMessage: ctx.input.resolutionMessage,
      cancellationMessage: ctx.input.cancellationMessage
    });

    let incident = flattenResource(result.data as JsonApiResource);

    return {
      output: {
        incident
      },
      message: `Updated incident **${incident.title}** (status: ${incident.status}).`
    };
  })
  .build();
