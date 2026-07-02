import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let incidentSchema = z.object({
  incidentNumber: z.string().describe('Unique incident number'),
  currentPhase: z
    .string()
    .describe('Current phase of the incident (UNACKED, ACKED, RESOLVED)'),
  alertCount: z.number().optional().describe('Number of alerts in this incident'),
  entityId: z.string().optional().describe('Entity ID for the incident'),
  service: z.string().optional().describe('Service associated with the incident'),
  host: z.string().optional().describe('Host associated with the incident'),
  startTime: z.string().optional().describe('When the incident was triggered'),
  lastAlertTime: z.string().optional().describe('When the last alert was received'),
  pagedUsers: z
    .array(z.string())
    .optional()
    .describe('Users who were paged for this incident'),
  pagedTeams: z
    .array(z.string())
    .optional()
    .describe('Teams that were paged for this incident'),
  pagedPolicies: z
    .array(z.any())
    .optional()
    .describe('Escalation policies that were triggered'),
  transitions: z.array(z.any()).optional().describe('State transitions of the incident')
});

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `List currently open, acknowledged, and recently resolved incidents. Returns all active incidents across the organization with their current phase, paged users, and alert details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      incidents: z.array(incidentSchema).describe('List of incidents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    let data = await client.listIncidents();
    let incidents = data?.incidents ?? [];

    return {
      output: { incidents },
      message: `Found **${incidents.length}** incident(s).`
    };
  })
  .build();
