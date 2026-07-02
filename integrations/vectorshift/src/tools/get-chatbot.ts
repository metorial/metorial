import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, fetchChatbot } from '../lib/client';
import { spec } from '../spec';

export let getChatbotTool = SlateTool.create(spec, {
  name: 'Get Chatbot',
  key: 'get_chatbot',
  description: `Fetch details of a specific chatbot by its ID or name. Returns the full chatbot configuration, deployment status, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatbotId: z
        .string()
        .optional()
        .describe('Chatbot ID. Required if name is not provided.'),
      name: z
        .string()
        .optional()
        .describe('Chatbot name. Required if chatbotId is not provided.'),
      username: z.string().optional().describe('Username for name-based lookups'),
      orgName: z.string().optional().describe('Organization name for name-based lookups')
    })
  )
  .output(
    z.object({
      chatbot: z.record(z.string(), z.unknown()).describe('Full chatbot object')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await fetchChatbot(api, {
      chatbotId: ctx.input.chatbotId,
      name: ctx.input.name,
      username: ctx.input.username,
      orgName: ctx.input.orgName
    });

    return {
      output: {
        chatbot: result.object ?? result
      },
      message: `Retrieved chatbot details.`
    };
  })
  .build();
