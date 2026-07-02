import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let agentEventTypes = [
  'Agent_Add',
  'Agent_Update',
  'Agent_Delete',
  'Agent_Presence_Update',
  'Agent_Channel_Preference_Update'
] as const;

export let agentEvents = SlateTrigger.create(spec, {
  name: 'Agent Events',
  key: 'agent_events',
  description:
    'Triggered when an agent is created, updated, deleted, or when their presence or channel preference changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of agent event'),
      agentId: z.string().describe('ID of the affected agent'),
      payload: z.any().describe('Full event payload from Zoho Desk')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the affected agent'),
      name: z.string().optional().describe('Agent name'),
      email: z.string().optional().describe('Agent email'),
      status: z.string().optional().describe('Agent status'),
      presenceStatus: z.string().optional().describe('Online/offline presence status'),
      previousState: z.any().optional().describe('Previous state (for update events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookIds: string[] = [];

      for (let eventType of agentEventTypes) {
        try {
          let webhookData: Record<string, any> = {
            name: `Slates - ${eventType}`,
            url: ctx.input.webhookBaseUrl,
            eventType,
            isActive: true
          };

          if (eventType === 'Agent_Update') {
            webhookData.includePrevState = true;
          }

          let result = await client.createWebhook(webhookData);
          webhookIds.push(result.id);
        } catch {
          // Continue
        }
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          /* ignore */
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as Record<string, any>;

      let eventType = data.eventType || data.event_type || 'unknown';
      let agent = data.payload || data.agent || data;
      let agentId = agent.id || agent.agentId || data.agentId || '';

      return {
        inputs: [
          {
            eventType,
            agentId: String(agentId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, agentId, payload } = ctx.input;
      let agent = payload?.payload || payload?.agent || payload || {};

      let normalizedType = eventType
        .replace(/^Agent_/, 'agent.')
        .replace(/_/g, '_')
        .toLowerCase();

      return {
        type: normalizedType,
        id: `${agentId}-${eventType}-${payload?.eventTime || Date.now()}`,
        output: {
          agentId,
          name:
            agent.name ||
            `${agent.firstName || ''} ${agent.lastName || ''}`.trim() ||
            undefined,
          email: agent.emailId || agent.email,
          status: agent.status,
          presenceStatus: agent.presenceStatus || agent.presence,
          previousState: agent.prevState || payload?.prevState
        }
      };
    }
  })
  .build();
