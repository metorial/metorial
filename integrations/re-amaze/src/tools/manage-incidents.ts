import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { numericIdAlias, resolveResourceId, toProviderId } from '../lib/response';
import { spec } from '../spec';

let incidentUpdateSchema = z.object({
  status: z
    .string()
    .describe('Update status (investigating, identified, monitoring, resolved)'),
  message: z.string().describe('Update message')
});

let incidentSystemSchema = z.object({
  incidentSystemIdentifier: z
    .string()
    .optional()
    .describe('Canonical incident-system association ID'),
  incidentSystemId: z
    .number()
    .optional()
    .describe(
      'Incident-system association ID. Use this when updating an existing system association.'
    ),
  systemId: z.number().optional().describe('Legacy numeric system ID when available'),
  systemIdentifier: z.string().describe('Canonical system ID'),
  systemTitle: z.string().optional().describe('System title'),
  status: z
    .string()
    .describe(
      'System status (operational, degraded_performance, partial_outage, major_outage, under_maintenance)'
    )
});

let incidentSchema = z.object({
  incidentId: z.number().optional().describe('Legacy numeric incident ID when available'),
  incidentIdentifier: z
    .string()
    .describe('Canonical incident ID, ready to pass to get_incident or update_incident'),
  title: z.string().describe('Incident title'),
  status: z.string().optional().describe('Current incident status'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
  updates: z
    .array(
      z.object({
        updateId: z
          .number()
          .optional()
          .describe('Legacy numeric incident update ID when available'),
        updateIdentifier: z.string().optional().describe('Canonical incident update ID'),
        status: z.string().optional(),
        message: z.string().optional()
      })
    )
    .optional()
    .describe('Incident status updates'),
  systems: z.array(incidentSystemSchema).optional().describe('Affected systems')
});

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `List status page incidents. Optionally filter to show only active (unresolved) incidents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      activeOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('When true, returns only active/unresolved incidents')
    })
  )
  .output(
    z.object({
      incidents: z.array(incidentSchema).describe('List of incidents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listIncidents(ctx.input.activeOnly);
    let incidents = (result.incidents || result || []).map((i: any) => mapIncident(i));

    return {
      output: { incidents },
      message: `Found **${incidents.length}** ${ctx.input.activeOnly ? 'active ' : ''}incidents.`
    };
  })
  .build();

export let getIncident = SlateTool.create(spec, {
  name: 'Get Incident',
  key: 'get_incident',
  description:
    'Retrieve a status page incident by ID, including its updates and affected systems. Call list_incidents to discover incident IDs and existing system association IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      incidentId: z
        .string()
        .min(1)
        .describe('Incident ID. Call list_incidents to find incident IDs.')
    })
  )
  .output(incidentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });
    let result = await client.getIncident(ctx.input.incidentId);
    let incident = result.incident || result;

    return {
      output: mapIncident(incident),
      message: `Retrieved incident **${incident.title}**.`
    };
  })
  .build();

export let createIncident = SlateTool.create(spec, {
  name: 'Create Incident',
  key: 'create_incident',
  description: `Create a new status page incident with a title, initial status update, and optionally associate affected systems with their operational status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Incident title'),
      updates: z
        .array(incidentUpdateSchema)
        .describe('Initial status updates for the incident'),
      systems: z
        .array(
          z.object({
            systemId: z
              .number()
              .optional()
              .describe('System ID to associate. Call list_systems to discover system IDs.'),
            systemIdentifier: z
              .string()
              .optional()
              .describe('Canonical system ID returned by list_systems'),
            status: z
              .enum([
                'operational',
                'degraded_performance',
                'partial_outage',
                'major_outage',
                'under_maintenance'
              ])
              .describe('System status')
          })
        )
        .optional()
        .describe('Systems affected by this incident')
    })
  )
  .output(incidentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.createIncident({
      title: ctx.input.title,
      updates: ctx.input.updates,
      systems: ctx.input.systems?.map(s => ({
        systemId: resolveResourceId(s.systemId, s.systemIdentifier, 'system ID'),
        status: s.status
      }))
    });

    let i = result.incident || result;

    return {
      output: mapIncident(i),
      message: `Created incident **${i.title}**.`
    };
  })
  .build();

export let updateIncident = SlateTool.create(spec, {
  name: 'Update Incident',
  key: 'update_incident',
  description: `Update an existing status page incident. Add new status updates, change the title, or update associated system statuses. This is also how you add follow-up updates to an incident.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      incidentId: z
        .string()
        .describe(
          'The ID of the incident to update. Call list_incidents to discover incident IDs.'
        ),
      title: z.string().optional().describe('Updated incident title'),
      updates: z
        .array(incidentUpdateSchema)
        .optional()
        .describe('New status updates to add to the incident'),
      systems: z
        .array(
          z.object({
            incidentSystemIdentifier: z
              .string()
              .optional()
              .describe('Canonical association ID returned by get_incident'),
            incidentSystemId: z
              .number()
              .optional()
              .describe(
                'Existing incident-system association ID. Call get_incident or list_incidents to discover it when updating an existing association.'
              ),
            systemId: z
              .number()
              .optional()
              .describe('System ID. Call list_systems to discover system IDs.'),
            systemIdentifier: z
              .string()
              .optional()
              .describe('Canonical system ID returned by list_systems'),
            status: z
              .enum([
                'operational',
                'degraded_performance',
                'partial_outage',
                'major_outage',
                'under_maintenance'
              ])
              .describe('Updated system status')
          })
        )
        .optional()
        .describe('Updated system associations')
    })
  )
  .output(incidentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.updateIncident(ctx.input.incidentId, {
      title: ctx.input.title,
      updates: ctx.input.updates,
      systems: ctx.input.systems?.map(s => ({
        id:
          s.incidentSystemId === undefined && s.incidentSystemIdentifier === undefined
            ? undefined
            : resolveResourceId(
                s.incidentSystemId,
                s.incidentSystemIdentifier,
                'incident-system association ID'
              ),
        systemId: resolveResourceId(s.systemId, s.systemIdentifier, 'system ID'),
        status: s.status
      }))
    });

    let i = result.incident || result;

    return {
      output: mapIncident(i),
      message: `Updated incident **${i.title || ctx.input.incidentId}**.`
    };
  })
  .build();

let mapIncident = (i: any) => ({
  incidentId: numericIdAlias(i.id, 'Incident ID'),
  incidentIdentifier: toProviderId(i.id, 'Incident ID'),
  title: i.title,
  status: i.status,
  createdAt: i.created_at,
  updatedAt: i.updated_at,
  updates: (i.updates || []).map((u: any) => ({
    updateId: u.id == null ? undefined : numericIdAlias(u.id, 'Incident update ID'),
    updateIdentifier: u.id == null ? undefined : toProviderId(u.id, 'Incident update ID'),
    status: u.status,
    message: u.message
  })),
  systems: (i.incidents_systems || []).map((s: any) => ({
    incidentSystemId:
      s.id == null ? undefined : numericIdAlias(s.id, 'Incident-system association ID'),
    incidentSystemIdentifier:
      s.id == null ? undefined : toProviderId(s.id, 'Incident-system association ID'),
    systemId: numericIdAlias(s.system_id ?? s.system?.id, 'System ID'),
    systemIdentifier: toProviderId(s.system_id ?? s.system?.id, 'System ID'),
    systemTitle: s.system?.title,
    status: s.status
  }))
});
