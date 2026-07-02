import { SlateTool } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageIncident = SlateTool.create(spec, {
  name: 'Manage Incident',
  key: 'manage_incident',
  description: `Create, acknowledge, resolve, get details, or delete an incident. Create manual incidents, acknowledge ongoing incidents, resolve them, or retrieve full incident details including timeline.`,
  instructions: [
    'Use action "create" to manually create a new incident.',
    'Use action "acknowledge" to acknowledge an ongoing incident.',
    'Use action "resolve" to resolve an ongoing incident.',
    'Use action "get" to retrieve full incident details.',
    'Use action "delete" to permanently remove an incident.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'acknowledge', 'resolve', 'get', 'delete'])
        .describe('Action to perform'),
      incidentId: z
        .string()
        .optional()
        .describe('Incident ID (required for acknowledge, resolve, get, delete)'),
      summary: z.string().optional().describe('Incident summary (for create)'),
      description: z.string().optional().describe('Detailed description (for create)'),
      requesterEmail: z.string().optional().describe('Email of person creating the incident'),
      callUrl: z.string().optional().describe('URL for the incident call'),
      smsBody: z.string().optional().describe('Custom SMS body'),
      acknowledgedBy: z
        .string()
        .optional()
        .describe('Email of person acknowledging the incident'),
      resolvedBy: z.string().optional().describe('Email of person resolving the incident'),
      includeTimeline: z
        .boolean()
        .optional()
        .describe('Include timeline events when getting incident details')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      name: z.string().nullable().describe('Incident name'),
      status: z.string().nullable().describe('Current status'),
      cause: z.string().nullable().describe('Incident cause'),
      startedAt: z.string().nullable().describe('When incident started'),
      resolvedAt: z.string().nullable().describe('When resolved'),
      acknowledgedAt: z.string().nullable().describe('When acknowledged'),
      deleted: z.boolean().optional().describe('Whether the incident was deleted'),
      timeline: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Timeline events (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let { action, incidentId } = ctx.input;

    if (action === 'delete') {
      if (!incidentId) throw new Error('incidentId is required for delete action');
      await client.deleteIncident(incidentId);
      return {
        output: {
          incidentId,
          name: null,
          status: null,
          cause: null,
          startedAt: null,
          resolvedAt: null,
          acknowledgedAt: null,
          deleted: true
        },
        message: `Incident **${incidentId}** deleted.`
      };
    }

    if (action === 'acknowledge') {
      if (!incidentId) throw new Error('incidentId is required for acknowledge action');
      let result = await client.acknowledgeIncident(incidentId, ctx.input.acknowledgedBy);
      let attrs = result.data?.attributes || result.data || {};
      return {
        output: {
          incidentId: String(result.data?.id || incidentId),
          name: attrs.name || null,
          status: attrs.status || 'acknowledged',
          cause: attrs.cause || null,
          startedAt: attrs.started_at || null,
          resolvedAt: attrs.resolved_at || null,
          acknowledgedAt: attrs.acknowledged_at || null
        },
        message: `Incident **${incidentId}** acknowledged.`
      };
    }

    if (action === 'resolve') {
      if (!incidentId) throw new Error('incidentId is required for resolve action');
      let result = await client.resolveIncident(incidentId, ctx.input.resolvedBy);
      let attrs = result.data?.attributes || result.data || {};
      return {
        output: {
          incidentId: String(result.data?.id || incidentId),
          name: attrs.name || null,
          status: attrs.status || 'resolved',
          cause: attrs.cause || null,
          startedAt: attrs.started_at || null,
          resolvedAt: attrs.resolved_at || null,
          acknowledgedAt: attrs.acknowledged_at || null
        },
        message: `Incident **${incidentId}** resolved.`
      };
    }

    if (action === 'get') {
      if (!incidentId) throw new Error('incidentId is required for get action');
      let result = await client.getIncident(incidentId);
      let attrs = result.data?.attributes || result.data || {};

      let timeline: Record<string, any>[] | undefined;
      if (ctx.input.includeTimeline) {
        let timelineResult = await client.getIncidentTimeline(incidentId);
        timeline = (timelineResult.data || []).map((item: any) => ({
          timelineId: String(item.id),
          ...(item.attributes || item)
        }));
      }

      return {
        output: {
          incidentId: String(result.data?.id || incidentId),
          name: attrs.name || null,
          status: attrs.status || null,
          cause: attrs.cause || null,
          startedAt: attrs.started_at || null,
          resolvedAt: attrs.resolved_at || null,
          acknowledgedAt: attrs.acknowledged_at || null,
          timeline
        },
        message: `Incident **${attrs.name || incidentId}**: ${attrs.status || 'unknown'}.`
      };
    }

    // Create
    let body: Record<string, any> = {};
    if (ctx.input.summary) body.summary = ctx.input.summary;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.requesterEmail) body.requester_email = ctx.input.requesterEmail;
    if (ctx.input.callUrl) body.call_url = ctx.input.callUrl;
    if (ctx.input.smsBody) body.sms_body = ctx.input.smsBody;

    let result = await client.createIncident(body);
    let attrs = result.data?.attributes || result.data || {};
    return {
      output: {
        incidentId: String(result.data?.id || ''),
        name: attrs.name || null,
        status: attrs.status || null,
        cause: attrs.cause || null,
        startedAt: attrs.started_at || null,
        resolvedAt: attrs.resolved_at || null,
        acknowledgedAt: attrs.acknowledged_at || null
      },
      message: `Incident created with ID **${result.data?.id}**.`
    };
  })
  .build();
