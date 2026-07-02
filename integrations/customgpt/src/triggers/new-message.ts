import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description:
    'Triggers when a new message is sent in a conversation. Polls for recent messages across conversations for a specific agent.'
})
  .input(
    z.object({
      promptId: z.number().describe('Message prompt ID'),
      sessionId: z.string().describe('Conversation session ID'),
      projectId: z.number().describe('Agent project ID'),
      userQuery: z.string().describe('User query text'),
      agentResponse: z.string().describe('Agent response text'),
      createdAt: z.string().describe('Message creation timestamp')
    })
  )
  .output(
    z.object({
      promptId: z.number().describe('Message prompt ID'),
      sessionId: z.string().describe('Conversation session ID'),
      projectId: z.number().describe('Agent project ID'),
      userQuery: z.string().describe('User query text'),
      agentResponse: z.string().describe('Agent response text'),
      createdAt: z.string().describe('Message creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new CustomGPTClient({ token: ctx.auth.token });

      let state = ctx.state as { projectId?: number; lastSeenAt?: string } | null;
      let projectId: number | undefined = state?.projectId;

      if (!projectId) {
        let agents = await client.listAgents({ page: 1, order: 'desc' });
        if (agents.items.length === 0) {
          return { inputs: [], updatedState: state ?? {} };
        }
        projectId = agents.items[0]!.projectId;
      }

      let resolvedProjectId = projectId;

      // Get recent conversations to check for new messages
      let conversations = await client.listConversations(resolvedProjectId, {
        page: 1,
        order: 'desc',
        orderBy: 'id'
      });

      let lastSeenAt = state?.lastSeenAt;
      let allNewMessages: Array<{
        promptId: number;
        sessionId: string;
        projectId: number;
        userQuery: string;
        agentResponse: string;
        createdAt: string;
      }> = [];

      // Check the most recent conversations for new messages
      let sessionsToCheck = conversations.items.slice(0, 5);
      for (let conv of sessionsToCheck) {
        try {
          let messages = await client.listMessages(resolvedProjectId, conv.sessionId, {
            page: 1,
            order: 'desc'
          });

          for (let msg of messages.items) {
            if (!lastSeenAt || msg.createdAt > lastSeenAt) {
              allNewMessages.push({
                promptId: msg.promptId,
                sessionId: conv.sessionId,
                projectId: resolvedProjectId,
                userQuery: msg.userQuery,
                agentResponse: msg.openaiResponse,
                createdAt: msg.createdAt
              });
            }
          }
        } catch (_e) {
          // Skip conversations that can't be accessed
        }
      }

      // On first poll, just capture state
      if (!lastSeenAt) {
        let latestAt: string | undefined;
        if (allNewMessages.length > 0) {
          latestAt = allNewMessages.reduce(
            (latest, m) => (m.createdAt > latest ? m.createdAt : latest),
            allNewMessages[0]!.createdAt
          );
        }

        return {
          inputs: [],
          updatedState: {
            projectId: resolvedProjectId,
            lastSeenAt: latestAt
          }
        };
      }

      // Sort by createdAt ascending
      allNewMessages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      let updatedLastSeenAt =
        allNewMessages.length > 0
          ? allNewMessages[allNewMessages.length - 1]!.createdAt
          : lastSeenAt;

      return {
        inputs: allNewMessages,
        updatedState: {
          projectId: resolvedProjectId,
          lastSeenAt: updatedLastSeenAt
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'message.created',
        id: `${ctx.input.sessionId}-${ctx.input.promptId}`,
        output: {
          promptId: ctx.input.promptId,
          sessionId: ctx.input.sessionId,
          projectId: ctx.input.projectId,
          userQuery: ctx.input.userQuery,
          agentResponse: ctx.input.agentResponse,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
