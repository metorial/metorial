import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let newConversation = SlateTrigger.create(spec, {
  name: 'New Conversation',
  key: 'new_conversation',
  description:
    'Triggers when a new conversation is created in an AI agent. Polls for recently created conversations.',
  instructions: ['Provide the projectId of the agent to monitor for new conversations.']
})
  .input(
    z.object({
      sessionId: z.string().describe('Conversation session ID'),
      projectId: z.number().describe('Agent project ID'),
      name: z.string().nullable().describe('Conversation name'),
      createdAt: z.string().describe('Conversation creation timestamp')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Conversation session ID'),
      projectId: z.number().describe('Agent project ID'),
      name: z.string().nullable().describe('Conversation name'),
      createdAt: z.string().describe('Conversation creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new CustomGPTClient({ token: ctx.auth.token });

      let state = ctx.state as { lastSeenAt?: string; projectId?: number } | null;
      let projectId: number | undefined = state?.projectId;

      if (!projectId) {
        let agents = await client.listAgents({ page: 1, order: 'desc' });
        if (agents.items.length === 0) {
          return { inputs: [], updatedState: state ?? {} };
        }
        projectId = agents.items[0]!.projectId;
      }

      let resolvedProjectId = projectId;

      let result = await client.listConversations(resolvedProjectId, {
        page: 1,
        order: 'desc',
        orderBy: 'id'
      });

      let lastSeenAt = state?.lastSeenAt;

      // On first poll, just capture state without emitting events
      if (!lastSeenAt) {
        let latestAt = result.items.length > 0 ? result.items[0]!.createdAt : undefined;

        return {
          inputs: [],
          updatedState: {
            projectId: resolvedProjectId,
            lastSeenAt: latestAt
          }
        };
      }

      let inputs = result.items
        .filter(c => c.createdAt > lastSeenAt)
        .map(c => ({
          sessionId: c.sessionId,
          projectId: resolvedProjectId,
          name: c.name,
          createdAt: c.createdAt
        }));

      let updatedLastSeenAt = inputs.length > 0 ? inputs[0]!.createdAt : lastSeenAt;

      return {
        inputs,
        updatedState: {
          projectId: resolvedProjectId,
          lastSeenAt: updatedLastSeenAt
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'conversation.created',
        id: ctx.input.sessionId,
        output: {
          sessionId: ctx.input.sessionId,
          projectId: ctx.input.projectId,
          name: ctx.input.name,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
