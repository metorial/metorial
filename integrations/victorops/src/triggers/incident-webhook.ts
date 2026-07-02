import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let incidentWebhook = SlateTrigger.create(spec, {
  name: 'Incident Webhook',
  key: 'incident_webhook',
  description:
    'Receives VictorOps outgoing webhook events for incident state changes (triggered, acknowledged, resolved). Configure the outgoing webhook in VictorOps Settings >> Outgoing Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of incident event'),
      incidentNumber: z.string().optional().describe('Incident number'),
      entityId: z.string().optional().describe('Entity ID'),
      entityDisplayName: z.string().optional().describe('Display name of the entity'),
      messageType: z.string().optional().describe('Message type from the alert'),
      routingKey: z.string().optional().describe('Routing key'),
      service: z.string().optional().describe('Service name'),
      currentAlertPhase: z.string().optional().describe('Current alert phase'),
      alertCount: z.number().optional().describe('Number of alerts'),
      rawPayload: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      incidentNumber: z.string().optional().describe('Incident number'),
      entityId: z.string().optional().describe('Entity ID'),
      entityDisplayName: z.string().optional().describe('Display name of the entity'),
      messageType: z.string().optional().describe('Message type'),
      routingKey: z.string().optional().describe('Routing key'),
      service: z.string().optional().describe('Service name'),
      currentAlertPhase: z.string().optional().describe('Current alert phase'),
      alertCount: z.number().optional().describe('Number of alerts')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let currentPhase =
        data?.CURRENT_ALERT_PHASE ?? data?.alert_phase ?? data?.currentAlertPhase ?? '';
      let eventType = 'triggered';
      if (currentPhase === 'ACKED' || currentPhase === 'acknowledged')
        eventType = 'acknowledged';
      else if (currentPhase === 'RESOLVED' || currentPhase === 'resolved')
        eventType = 'resolved';

      let incidentNumber = String(
        data?.INCIDENT_NAME ?? data?.incident_name ?? data?.incidentNumber ?? ''
      );

      return {
        inputs: [
          {
            eventType,
            incidentNumber,
            entityId: data?.ENTITY_ID ?? data?.entity_id ?? data?.entityId,
            entityDisplayName:
              data?.ENTITY_DISPLAY_NAME ??
              data?.entity_display_name ??
              data?.entityDisplayName,
            messageType: data?.MESSAGE_TYPE ?? data?.message_type ?? data?.messageType,
            routingKey: data?.ROUTING_KEY ?? data?.routing_key ?? data?.routingKey,
            service: data?.SERVICE ?? data?.service,
            currentAlertPhase: currentPhase,
            alertCount: data?.ALERT_COUNT ?? data?.alert_count ?? data?.alertCount,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `incident.${ctx.input.eventType}`,
        id: `webhook-${ctx.input.incidentNumber}-${ctx.input.currentAlertPhase}-${Date.now()}`,
        output: {
          incidentNumber: ctx.input.incidentNumber,
          entityId: ctx.input.entityId,
          entityDisplayName: ctx.input.entityDisplayName,
          messageType: ctx.input.messageType,
          routingKey: ctx.input.routingKey,
          service: ctx.input.service,
          currentAlertPhase: ctx.input.currentAlertPhase,
          alertCount: ctx.input.alertCount
        }
      };
    }
  })
  .build();
