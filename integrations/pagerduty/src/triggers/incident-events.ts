import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let incidentEvents = SlateTrigger.create(spec, {
  name: 'Incident Events',
  key: 'incident_events',
  description:
    'Triggers on PagerDuty incident lifecycle events including triggered, acknowledged, resolved, escalated, reassigned, annotated, priority changes, and responder updates.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of incident event'),
      eventId: z.string().describe('Unique event ID'),
      incidentId: z.string().describe('Incident ID'),
      incidentNumber: z.number().optional().describe('Incident number'),
      title: z.string().optional().describe('Incident title'),
      status: z.string().optional().describe('Incident status'),
      urgency: z.string().optional().describe('Incident urgency'),
      htmlUrl: z.string().optional().describe('Incident web URL'),
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      assigneeIds: z.array(z.string()).optional().describe('Current assignee user IDs'),
      assigneeNames: z.array(z.string()).optional().describe('Current assignee names'),
      escalationPolicyId: z.string().optional().describe('Escalation policy ID'),
      priority: z.string().optional().describe('Priority name'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      incidentNumber: z.number().optional().describe('Incident number'),
      title: z.string().optional().describe('Incident title'),
      status: z.string().optional().describe('Current incident status'),
      urgency: z.string().optional().describe('Urgency level'),
      htmlUrl: z.string().optional().describe('Web URL to the incident'),
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      assigneeIds: z.array(z.string()).optional().describe('Current assignee user IDs'),
      assigneeNames: z.array(z.string()).optional().describe('Current assignee names'),
      escalationPolicyId: z.string().optional().describe('Escalation policy ID'),
      priority: z.string().optional().describe('Priority name'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PagerDutyClient({
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType,
        region: ctx.config.region
      });

      let subscription = await client.createWebhookSubscription({
        deliveryUrl: ctx.input.webhookBaseUrl,
        events: [
          'incident.triggered',
          'incident.acknowledged',
          'incident.unacknowledged',
          'incident.resolved',
          'incident.escalated',
          'incident.delegated',
          'incident.reassigned',
          'incident.reopened',
          'incident.annotated',
          'incident.priority_updated',
          'incident.responder.added',
          'incident.responder.replied',
          'incident.status_update_published'
        ],
        filterType: 'account_reference',
        description: 'Slates incident events webhook'
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PagerDutyClient({
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType,
        region: ctx.config.region
      });

      let details = ctx.input.registrationDetails as { subscriptionId: string };
      await client.deleteWebhookSubscription(details.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        event?: {
          id?: string;
          event_type?: string;
          occurred_at?: string;
          data?: {
            id?: string;
            number?: number;
            title?: string;
            status?: string;
            urgency?: string;
            html_url?: string;
            service?: { id?: string; summary?: string };
            assignees?: { id?: string; summary?: string }[];
            escalation_policy?: { id?: string };
            priority?: { summary?: string; name?: string };
          };
        };
      };

      if (!body.event?.event_type || !body.event?.data?.id) {
        return { inputs: [] };
      }

      let evt = body.event;
      let data = evt.data!;

      return {
        inputs: [
          {
            eventType: evt.event_type!,
            eventId: evt.id || `${data.id}-${evt.event_type}-${evt.occurred_at}`,
            incidentId: data.id!,
            incidentNumber: data.number,
            title: data.title,
            status: data.status,
            urgency: data.urgency,
            htmlUrl: data.html_url,
            serviceId: data.service?.id,
            serviceName: data.service?.summary,
            assigneeIds: data.assignees?.map(a => a.id).filter(Boolean) as
              | string[]
              | undefined,
            assigneeNames: data.assignees?.map(a => a.summary).filter(Boolean) as
              | string[]
              | undefined,
            escalationPolicyId: data.escalation_policy?.id,
            priority: data.priority?.summary || data.priority?.name,
            occurredAt: evt.occurred_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          incidentId: ctx.input.incidentId,
          incidentNumber: ctx.input.incidentNumber,
          title: ctx.input.title,
          status: ctx.input.status,
          urgency: ctx.input.urgency,
          htmlUrl: ctx.input.htmlUrl,
          serviceId: ctx.input.serviceId,
          serviceName: ctx.input.serviceName,
          assigneeIds: ctx.input.assigneeIds,
          assigneeNames: ctx.input.assigneeNames,
          escalationPolicyId: ctx.input.escalationPolicyId,
          priority: ctx.input.priority,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
