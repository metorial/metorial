import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, listChatbots } from '../lib/client';
import { spec } from '../spec';

export let listChatbotsTool = SlateTool.create(spec, {
  name: 'List Chatbots',
  key: 'list_chatbots',
  description: `List all chatbots in the VectorShift account. Optionally include shared chatbots and retrieve full chatbot details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeShared: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include chatbots shared with you'),
      verbose: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include full chatbot objects in the response')
    })
  )
  .output(
    z.object({
      chatbotIds: z.array(z.string()).describe('List of chatbot IDs'),
      chatbots: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Full chatbot objects (when verbose is true)')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await listChatbots(api, {
      includeShared: ctx.input.includeShared,
      verbose: ctx.input.verbose
    });

    return {
      output: {
        chatbotIds: result.object_ids ?? [],
        chatbots: result.objects
      },
      message: `Found **${(result.object_ids ?? []).length}** chatbots.`
    };
  })
  .build();
