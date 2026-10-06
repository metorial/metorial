import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let componentStatusSchema = z.object({
  componentId: z.string().describe('ID of the status page component'),
  status: z
    .string()
    .describe(
      'Status to set for the component (e.g., "operational", "degraded_performance", "partial_outage", "full_outage"; "major_outage" is accepted as a legacy alias)'
    )
});

export let manageStatusPageIncident = SlateTool.create(spec, {
  name: 'Manage Status Page Incident',
  key: 'manage_status_page_incident',
  description: `Create or update a status page incident. Use **create** to publish a new incident to a status page, or **update** to change an existing status page incident's status, message, or affected components. You can also post an update message to an existing incident.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'post_update']).describe('Operation to perform'),
      statusPageIncidentId: z
        .string()
        .optional()
        .describe('Required for update and post_update actions'),
      statusPageId: z.string().optional().describe('Required for create action'),
      name: z.string().optional().describe('Incident title (required for create)'),
      incidentStatus: z
        .string()
        .optional()
        .describe(
          'Status of the incident (e.g., "investigating", "identified", "monitoring", "resolved")'
        ),
      message: z
        .string()
        .optional()
        .describe('Update message (required for create and post_update)'),
      notifySubscribers: z
        .boolean()
        .optional()
        .describe(
          'Whether to notify subscribers; defaults to false. Publishing remains visible on the status page.'
        ),
      componentStatuses: z
        .array(componentStatusSchema)
        .optional()
        .describe('Affected components and their statuses'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Deduplication key for create action; auto-generated if omitted')
    })
  )
  .output(
    z.object({
      statusPageIncidentId: z.string().optional(),
      name: z.string().optional(),
      incidentStatus: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let transformedComponents = input.componentStatuses?.map(c => ({
      component_id: c.componentId,
      component_status: c.status === 'major_outage' ? 'full_outage' : c.status
    }));

    if (
      input.incidentStatus !== undefined &&
      !['investigating', 'identified', 'monitoring', 'resolved'].includes(input.incidentStatus)
    )
      throw createApiServiceError(
        'Use investigating, identified, monitoring or resolved for incidentStatus.'
      );
    for (const component of transformedComponents ?? []) {
      if (
        !['operational', 'degraded_performance', 'partial_outage', 'full_outage'].includes(
          component.component_status
        )
      )
        throw createApiServiceError(
          'Use operational, degraded_performance, partial_outage or full_outage for component status.'
        );
    }
    if (input.incidentStatus === 'resolved' && transformedComponents !== undefined)
      throw createApiServiceError(
        'Omit componentStatuses when resolving an incident; affected components are restored automatically.'
      );
    if (input.action === 'create') {
      if (!input.statusPageId || !input.name || !input.incidentStatus || !input.message) {
        throw createApiServiceError(
          'statusPageId, name, incidentStatus, and message are required for creating a status page incident.'
        );
      }
      let result = await client.createStatusPageIncident({
        statusPageId: input.statusPageId,
        name: input.name,
        incidentStatus: input.incidentStatus,
        message: input.message,
        idempotencyKey: input.idempotencyKey || crypto.randomUUID(),
        notifySubscribers: input.notifySubscribers,
        componentStatuses: transformedComponents
      });
      let inc = result.status_page_incident;
      return {
        output: {
          statusPageIncidentId: inc.id,
          name: inc.name,
          incidentStatus: inc.incident_status
        },
        message: `Created status page incident **${inc.name}**.`
      };
    }

    if (input.action === 'update') {
      if (!input.statusPageIncidentId) {
        throw createApiServiceError(
          'statusPageIncidentId is required for updating a status page incident.'
        );
      }
      let result = await client.updateStatusPageIncident(input.statusPageIncidentId, {
        name: input.name,
        incidentStatus: input.incidentStatus,
        message: input.message,
        componentStatuses: transformedComponents,
        notifySubscribers: input.notifySubscribers
      });
      let inc = result.status_page_incident;
      return {
        output: {
          statusPageIncidentId: inc.id,
          name: inc.name,
          incidentStatus: inc.incident_status
        },
        message: `Updated status page incident **${inc.name}**.`
      };
    }

    if (input.action === 'post_update') {
      if (!input.statusPageIncidentId || !input.message) {
        throw createApiServiceError(
          'statusPageIncidentId and message are required for posting an update.'
        );
      }
      await client.postStatusPageIncidentUpdate(input.statusPageIncidentId, {
        message: input.message,
        incidentStatus: input.incidentStatus,
        componentStatuses: transformedComponents,
        notifySubscribers: input.notifySubscribers
      });
      const { status_page_incident: current } = await client.getStatusPageIncident(
        input.statusPageIncidentId
      );
      return {
        output: {
          statusPageIncidentId: current.id,
          name: current.name,
          incidentStatus: current.incident_status
        },
        message: `Posted update to status page incident ${input.statusPageIncidentId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${input.action}`);
  })
  .build();
