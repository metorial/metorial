import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  type ApiResource,
  notificationBody,
  notificationsSchema,
  requireFields,
  teamNameSchema
} from '../lib/api';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageIncident = SlateTool.create(spec, {
  name: 'Manage Incident',
  key: 'manage_incident',
  description: `Create, acknowledge, resolve, get details, or delete an incident. Creating an incident can notify the on-call person and escalate to the team according to notification settings or an escalation policy. Retrieve full details and timeline before changing an existing incident.`,
  tags: { readOnly: false, destructive: true },
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
      teamName: teamNameSchema,
      ...notificationsSchema.shape,
      action: z
        .enum(['create', 'acknowledge', 'resolve', 'get', 'delete'])
        .describe('Action to perform'),
      incidentId: z
        .string()
        .optional()
        .describe('Incident ID (required for acknowledge, resolve, get, delete)'),
      summary: z.string().optional().describe('Incident summary (for create)'),
      name: z.string().optional().describe('Short incident name for creation'),
      description: z.string().optional().describe('Detailed description (for create)'),
      requesterEmail: z.string().optional().describe('Email of person creating the incident'),
      callUrl: z
        .string()
        .optional()
        .describe('Legacy field unsupported by the current creation API; omit'),
      smsBody: z
        .string()
        .optional()
        .describe('Legacy field unsupported by the current creation API; omit'),
      policyId: z
        .string()
        .optional()
        .describe(
          'Escalation policy for incident creation; overrides simple notification settings'
        ),
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
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Timeline events (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      teamName: ctx.input.teamName ?? ctx.config.teamName
    });

    let { action, incidentId } = ctx.input;

    if (action === 'delete') {
      if (!incidentId) throw createApiServiceError('incidentId is required for delete action');
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
      if (!incidentId)
        throw createApiServiceError('incidentId is required for acknowledge action');
      let result = await client.acknowledgeIncident(incidentId, ctx.input.acknowledgedBy);
      let attrs = result.data.attributes;
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
      if (!incidentId)
        throw createApiServiceError('incidentId is required for resolve action');
      let result = await client.resolveIncident(incidentId, ctx.input.resolvedBy);
      let attrs = result.data.attributes;
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
      if (!incidentId) throw createApiServiceError('incidentId is required for get action');
      let result = await client.getIncident(incidentId);
      let attrs = result.data.attributes;

      let timeline: Record<string, unknown>[] | undefined;
      if (ctx.input.includeTimeline) {
        let timelineResult = await client.getIncidentTimeline(incidentId);
        timeline = (timelineResult.data || []).map((item: ApiResource) => ({
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
    let body: Record<string, unknown> = notificationBody(ctx.input);
    if (ctx.input.summary) body.summary = ctx.input.summary;
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.requesterEmail) body.requester_email = ctx.input.requesterEmail;
    requireFields(ctx.input.summary, ctx.input.requesterEmail);
    if (ctx.input.callUrl !== undefined || ctx.input.smsBody !== undefined)
      throw createApiServiceError(
        'The current incident creation API does not support callUrl or smsBody. Omit these legacy fields.'
      );
    if (ctx.input.policyId !== undefined) body.policy_id = ctx.input.policyId;

    let result = await client.createIncident(body);
    let attrs = result.data.attributes;
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
