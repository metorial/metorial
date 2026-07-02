import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let chatbotSchema = z.object({
  chatbotId: z.string().optional().describe('Chatbot identifier.'),
  name: z.string().optional().describe('Chatbot name.'),
  created: z.string().optional().describe('Creation timestamp.')
});

export let startChatbot = SlateTool.create(spec, {
  name: 'Start Chatbot',
  key: 'start_chatbot',
  description: `Trigger a chatbot for a specific contact. You can also list available chatbots to find the correct chatbot ID. Requires Pro plan or above.`,
  instructions: [
    'Use action "list" to retrieve available chatbots, then "start" with the chatbot ID to trigger it for a contact.'
  ],
  constraints: ['Chatbot functionality is available on Wati Pro plan and above.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'start'])
        .describe(
          '"list" to retrieve available chatbots, "start" to trigger a chatbot for a contact.'
        ),
      chatbotId: z
        .string()
        .optional()
        .describe('ID of the chatbot to start. Required for "start" action.'),
      target: z
        .string()
        .optional()
        .describe(
          'Contact identifier: phone number with country code, contact ID, or Channel:PhoneNumber. Required for "start" action.'
        ),
      pageNumber: z
        .number()
        .int()
        .min(1)
        .default(1)
        .describe('Page number for listing chatbots (1-based).'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe('Number of chatbots per page for listing (max 100).')
    })
  )
  .output(
    z.object({
      chatbots: z
        .array(chatbotSchema)
        .optional()
        .describe('List of available chatbots (for "list" action).'),
      result: z
        .boolean()
        .optional()
        .describe('Whether the chatbot was started successfully (for "start" action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    if (ctx.input.action === 'list') {
      let result = await client.listChatbots({
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      });

      let chatbots = (result?.chatbot_list || []).map((c: any) => ({
        chatbotId: c.id,
        name: c.name,
        created: c.created
      }));

      return {
        output: { chatbots },
        message: `Retrieved **${chatbots.length}** chatbots.`
      };
    }

    if (ctx.input.action === 'start') {
      if (!ctx.input.chatbotId || !ctx.input.target) {
        throw new Error('chatbotId and target are required for starting a chatbot.');
      }

      let result = await client.startChatbot(ctx.input.chatbotId, ctx.input.target);

      return {
        output: { result: result?.result ?? true },
        message: `Chatbot **${ctx.input.chatbotId}** started for **${ctx.input.target}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
