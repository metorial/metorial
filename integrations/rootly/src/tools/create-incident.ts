import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResource, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let createIncident = SlateTool.create(spec, {
  name: 'Create Incident',
  key: 'create_incident',
  description: `Create a new incident in Rootly. Optionally associate it with services, environments, severities, and teams.
The incident title is auto-generated if not provided.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Incident title (auto-generated if omitted)'),
      summary: z.string().optional().describe('Summary of the incident'),
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
        .describe('Initial status'),
      kind: z
        .enum(['normal', 'backfilled', 'scheduled', 'test'])
        .optional()
        .describe('Incident kind (defaults to "normal")'),
      severityId: z.string().optional().describe('Severity ID to assign'),
      isPrivate: z.boolean().optional().describe('Whether the incident is private'),
      serviceIds: z.array(z.string()).optional().describe('IDs of affected services'),
      environmentIds: z.array(z.string()).optional().describe('IDs of affected environments'),
      incidentTypeIds: z.array(z.string()).optional().describe('Incident type IDs'),
      functionalityIds: z.array(z.string()).optional().describe('Functionality IDs'),
      groupIds: z.array(z.string()).optional().describe('Team/group IDs'),
      labels: z.record(z.string(), z.string()).optional().describe('Key-value labels')
    })
  )
  .output(
    z.object({
      incident: z.record(z.string(), z.any()).describe('Created incident details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createIncident({
      title: ctx.input.title,
      summary: ctx.input.summary,
      status: ctx.input.status,
      kind: ctx.input.kind,
      severityId: ctx.input.severityId,
      private: ctx.input.isPrivate,
      serviceIds: ctx.input.serviceIds,
      environmentIds: ctx.input.environmentIds,
      incidentTypeIds: ctx.input.incidentTypeIds,
      functionalityIds: ctx.input.functionalityIds,
      groupIds: ctx.input.groupIds,
      labels: ctx.input.labels
    });

    let incident = flattenResource(result.data as JsonApiResource);

    return {
      output: {
        incident
      },
      message: `Created incident **${incident.title}** (ID: ${incident.id}, status: ${incident.status}).`
    };
  })
  .build();
