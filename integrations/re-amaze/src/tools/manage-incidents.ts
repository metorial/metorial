import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let incidentUpdateSchema = z.object({
  status: z
    .string()
    .describe('Update status (investigating, identified, monitoring, resolved)'),
  message: z.string().describe('Update message')
});

let incidentSystemSchema = z.object({
  systemId: z.number().describe('System ID'),
  systemTitle: z.string().optional().describe('System title'),
  status: z
    .string()
    .describe(
      'System status (operational, degraded_performance, partial_outage, major_outage, under_maintenance)'
    )
});

let incidentSchema = z.object({
  incidentId: z.number().describe('Incident ID'),
  title: z.string().describe('Incident title'),
  status: z.string().optional().describe('Current incident status'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
  updates: z
    .array(
      z.object({
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
            systemId: z.number().describe('System ID to associate'),
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
      systems: ctx.input.systems
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
      incidentId: z.string().describe('The ID of the incident to update'),
      title: z.string().optional().describe('Updated incident title'),
      updates: z
        .array(incidentUpdateSchema)
        .optional()
        .describe('New status updates to add to the incident'),
      systems: z
        .array(
          z.object({
            incidentSystemId: z
              .number()
              .optional()
              .describe(
                'Existing incident-system association ID (for updating existing associations)'
              ),
            systemId: z.number().describe('System ID'),
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
        id: s.incidentSystemId,
        systemId: s.systemId,
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
  incidentId: i.id,
  title: i.title,
  status: i.status,
  createdAt: i.created_at,
  updatedAt: i.updated_at,
  updates: (i.updates || []).map((u: any) => ({
    status: u.status,
    message: u.message
  })),
  systems: (i.incidents_systems || []).map((s: any) => ({
    systemId: s.system_id || s.system?.id,
    systemTitle: s.system?.title,
    status: s.status
  }))
});
