import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

export let incidentEvents = SlateTrigger.create(spec, {
  name: 'Incident Events',
  key: 'incident_events',
  description:
    'Triggers when incidents are created, acknowledged, or resolved in Better Stack. Polls for new and updated incidents periodically.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'acknowledged', 'resolved'])
        .describe('Type of incident event'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      incidentId: z.string().describe('Incident ID'),
      name: z.string().nullable().describe('Incident name'),
      url: z.string().nullable().describe('Affected URL'),
      cause: z.string().nullable().describe('Incident cause'),
      startedAt: z.string().nullable().describe('When the incident started'),
      acknowledgedAt: z.string().nullable().describe('When acknowledged'),
      resolvedAt: z.string().nullable().describe('When resolved'),
      screenshotUrl: z.string().nullable().describe('Screenshot URL')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      name: z.string().nullable().describe('Incident name'),
      url: z.string().nullable().describe('Affected URL'),
      cause: z.string().nullable().describe('Incident cause'),
      status: z.string().describe('Current incident status'),
      startedAt: z.string().nullable().describe('When the incident started'),
      acknowledgedAt: z.string().nullable().describe('When acknowledged'),
      resolvedAt: z.string().nullable().describe('When resolved'),
      screenshotUrl: z.string().nullable().describe('Screenshot URL')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new UptimeClient({
        token: ctx.auth.token,
        teamName: ctx.config.teamName
      });

      let state = ctx.state || {};
      let lastPollTime = state.lastPollTime || null;
      let knownIncidents: Record<
        string,
        { acknowledgedAt: string | null; resolvedAt: string | null }
      > = state.knownIncidents || {};

      // Fetch recent incidents
      let params: Record<string, any> = { perPage: 50 };
      if (lastPollTime) {
        params.from = lastPollTime;
      }

      let result = await client.listIncidents(params);
      let incidents = result.data || [];
      let inputs: any[] = [];
      let newKnownIncidents: Record<
        string,
        { acknowledgedAt: string | null; resolvedAt: string | null }
      > = { ...knownIncidents };

      for (let item of incidents) {
        let attrs = item.attributes || item;
        let incidentId = String(item.id);
        let known = knownIncidents[incidentId];

        let baseEvent = {
          incidentId,
          name: attrs.name || null,
          url: attrs.url || null,
          cause: attrs.cause || null,
          startedAt: attrs.started_at || null,
          acknowledgedAt: attrs.acknowledged_at || null,
          resolvedAt: attrs.resolved_at || null,
          screenshotUrl: attrs.screenshot_url || null
        };

        if (!known) {
          // New incident
          inputs.push({
            eventType: 'created' as const,
            eventId: `${incidentId}_created_${attrs.started_at || Date.now()}`,
            ...baseEvent
          });
        }

        // Check for acknowledged
        if (attrs.acknowledged_at && !known?.acknowledgedAt) {
          inputs.push({
            eventType: 'acknowledged' as const,
            eventId: `${incidentId}_acknowledged_${attrs.acknowledged_at}`,
            ...baseEvent
          });
        }

        // Check for resolved
        if (attrs.resolved_at && !known?.resolvedAt) {
          inputs.push({
            eventType: 'resolved' as const,
            eventId: `${incidentId}_resolved_${attrs.resolved_at}`,
            ...baseEvent
          });
        }

        newKnownIncidents[incidentId] = {
          acknowledgedAt: attrs.acknowledged_at || null,
          resolvedAt: attrs.resolved_at || null
        };
      }

      // Clean up old known incidents (keep last 500)
      let knownIds = Object.keys(newKnownIncidents);
      if (knownIds.length > 500) {
        let toRemove = knownIds.slice(0, knownIds.length - 500);
        for (let id of toRemove) {
          delete newKnownIncidents[id];
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownIncidents: newKnownIncidents
        }
      };
    },

    handleEvent: async ctx => {
      let statusMap: Record<string, string> = {
        created: 'started',
        acknowledged: 'acknowledged',
        resolved: 'resolved'
      };

      return {
        type: `incident.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          incidentId: ctx.input.incidentId,
          name: ctx.input.name,
          url: ctx.input.url,
          cause: ctx.input.cause,
          status: statusMap[ctx.input.eventType] || ctx.input.eventType,
          startedAt: ctx.input.startedAt,
          acknowledgedAt: ctx.input.acknowledgedAt,
          resolvedAt: ctx.input.resolvedAt,
          screenshotUrl: ctx.input.screenshotUrl
        }
      };
    }
  })
  .build();
