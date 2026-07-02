import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let incidentEvents = SlateTrigger.create(spec, {
  name: 'Incident Events',
  key: 'incident_events',
  description:
    '[Polling fallback] Fires when incidents are triggered, acknowledged, or resolved. Polls for changes in incident state.'
})
  .input(
    z.object({
      eventType: z
        .enum(['triggered', 'acknowledged', 'resolved'])
        .describe('Type of incident event'),
      incidentNumber: z.string().describe('Incident number'),
      currentPhase: z.string().describe('Current phase of the incident'),
      entityId: z.string().optional().describe('Entity ID associated with the incident'),
      service: z.string().optional().describe('Service associated with the incident'),
      host: z.string().optional().describe('Host associated with the incident'),
      startTime: z.string().optional().describe('When the incident started'),
      alertCount: z.number().optional().describe('Number of alerts in the incident'),
      pagedUsers: z.array(z.string()).optional().describe('Users paged for this incident'),
      pagedTeams: z.array(z.string()).optional().describe('Teams paged for this incident')
    })
  )
  .output(
    z.object({
      incidentNumber: z.string().describe('Incident number'),
      currentPhase: z.string().describe('Current phase (UNACKED, ACKED, RESOLVED)'),
      entityId: z.string().optional().describe('Entity ID'),
      service: z.string().optional().describe('Service name'),
      host: z.string().optional().describe('Host name'),
      startTime: z.string().optional().describe('Incident start time'),
      alertCount: z.number().optional().describe('Number of alerts'),
      pagedUsers: z.array(z.string()).optional().describe('Paged users'),
      pagedTeams: z.array(z.string()).optional().describe('Paged teams')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        apiId: ctx.auth.apiId,
        token: ctx.auth.token
      });

      let data = await client.listIncidents();
      let incidents: any[] = data?.incidents ?? [];

      let previousIncidents: Record<string, string> = ctx.state?.knownIncidents ?? {};
      let inputs: any[] = [];

      for (let incident of incidents) {
        let incidentNumber = String(incident.incidentNumber);
        let currentPhase = incident.currentPhase ?? '';
        let previousPhase = previousIncidents[incidentNumber];

        if (previousPhase !== currentPhase) {
          let eventType: 'triggered' | 'acknowledged' | 'resolved' = 'triggered';
          if (currentPhase === 'ACKED') eventType = 'acknowledged';
          else if (currentPhase === 'RESOLVED') eventType = 'resolved';

          inputs.push({
            eventType,
            incidentNumber,
            currentPhase,
            entityId: incident.entityId,
            service: incident.service,
            host: incident.host,
            startTime: incident.startTime,
            alertCount: incident.alertCount,
            pagedUsers: incident.pagedUsers ?? [],
            pagedTeams: incident.pagedTeams ?? []
          });
        }
      }

      let updatedKnownIncidents: Record<string, string> = {};
      for (let incident of incidents) {
        updatedKnownIncidents[String(incident.incidentNumber)] = incident.currentPhase ?? '';
      }

      return {
        inputs,
        updatedState: {
          knownIncidents: updatedKnownIncidents
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `incident.${ctx.input.eventType}`,
        id: `${ctx.input.incidentNumber}-${ctx.input.currentPhase}`,
        output: {
          incidentNumber: ctx.input.incidentNumber,
          currentPhase: ctx.input.currentPhase,
          entityId: ctx.input.entityId,
          service: ctx.input.service,
          host: ctx.input.host,
          startTime: ctx.input.startTime,
          alertCount: ctx.input.alertCount,
          pagedUsers: ctx.input.pagedUsers,
          pagedTeams: ctx.input.pagedTeams
        }
      };
    }
  })
  .build();
