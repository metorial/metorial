import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createApiClient, fetchChatbot, listChatbots } from '../lib/client';
import { spec } from '../spec';

export let chatbotChangesTrigger = SlateTrigger.create(spec, {
  name: 'Chatbot Changes',
  key: 'chatbot_changes',
  description: 'Detects when chatbots are added or removed from the account.'
})
  .input(
    z.object({
      changeType: z
        .enum(['added', 'removed'])
        .describe('Whether the chatbot was added or removed'),
      chatbotId: z.string().describe('ID of the affected chatbot')
    })
  )
  .output(
    z.object({
      chatbotId: z.string().describe('ID of the affected chatbot'),
      name: z
        .string()
        .optional()
        .describe('Name of the chatbot (available for added chatbots)'),
      description: z.string().optional().describe('Description of the chatbot')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let api = createApiClient(ctx.auth.token);
      let result = await listChatbots(api, { includeShared: false, verbose: false });
      let currentIds: string[] = result.object_ids ?? [];
      let previousIds: string[] = (ctx.state?.knownIds as string[]) ?? [];

      let addedIds = currentIds.filter(id => !previousIds.includes(id));
      let removedIds = previousIds.filter(id => !currentIds.includes(id));

      let inputs = [
        ...addedIds.map(id => ({ changeType: 'added' as const, chatbotId: id })),
        ...removedIds.map(id => ({ changeType: 'removed' as const, chatbotId: id }))
      ];

      return {
        inputs,
        updatedState: {
          knownIds: currentIds
        }
      };
    },

    handleEvent: async ctx => {
      let name: string | undefined;
      let description: string | undefined;

      if (ctx.input.changeType === 'added') {
        try {
          let api = createApiClient(ctx.auth.token);
          let result = await fetchChatbot(api, { chatbotId: ctx.input.chatbotId });
          let obj = result.object ?? result;
          name = obj.name;
          description = obj.description;
        } catch {
          // Chatbot details may not be available
        }
      }

      return {
        type: `chatbot.${ctx.input.changeType}`,
        id: `chatbot.${ctx.input.changeType}.${ctx.input.chatbotId}`,
        output: {
          chatbotId: ctx.input.chatbotId,
          name,
          description
        }
      };
    }
  })
  .build();
