import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let agentEvents = SlateTrigger.create(spec, {
  name: 'Agent Events',
  key: 'agent_events',
  description:
    "Triggers when an agent lifecycle event occurs (connected, lost, disconnected, stopping, stopped, blocked). Useful for automating infrastructure scaling and monitoring agent health. Configure a webhook in your Buildkite organization's Notification Services settings."
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of agent event (agent.connected, agent.lost, agent.disconnected, agent.stopping, agent.stopped, agent.blocked)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      agentId: z.string().describe('UUID of the agent'),
      agentName: z.string().describe('Name of the agent'),
      hostname: z.string().describe('Hostname of the agent machine'),
      version: z.string().describe('Agent version'),
      ipAddress: z.string().nullable().describe('IP address of the agent'),
      connectionState: z.string().describe('Connection state of the agent'),
      tags: z.array(z.string()).describe('Agent metadata tags')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('UUID of the agent'),
      agentName: z.string().describe('Name of the agent'),
      hostname: z.string().describe('Hostname of the agent machine'),
      version: z.string().describe('Agent version'),
      ipAddress: z.string().nullable().describe('IP address of the agent'),
      connectionState: z.string().describe('Connection state of the agent'),
      tags: z.array(z.string()).describe('Agent metadata tags')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let event = data.event as string | undefined;

      if (!event?.startsWith('agent.')) {
        return { inputs: [] };
      }

      let agent = data.agent;

      if (!agent) {
        return { inputs: [] };
      }

      let eventId = `${event}-${agent.id}-${agent.connection_state ?? ''}`;

      return {
        inputs: [
          {
            eventType: event,
            eventId,
            agentId: agent.id,
            agentName: agent.name ?? '',
            hostname: agent.hostname ?? '',
            version: agent.version ?? '',
            ipAddress: agent.ip_address ?? null,
            connectionState: agent.connection_state ?? '',
            tags: agent.meta_data ?? []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          agentId: ctx.input.agentId,
          agentName: ctx.input.agentName,
          hostname: ctx.input.hostname,
          version: ctx.input.version,
          ipAddress: ctx.input.ipAddress,
          connectionState: ctx.input.connectionState,
          tags: ctx.input.tags
        }
      };
    }
  });
