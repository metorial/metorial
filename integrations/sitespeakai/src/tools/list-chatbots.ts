import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let chatbotSchema = z.object({
  chatbotId: z.string().describe('Chatbot identifier.'),
  name: z.string().describe('Chatbot display name.'),
  type: z.string().nullable().describe('Chatbot type (e.g. "assistant").'),
  createdAt: z.string().nullable().describe('Creation timestamp.'),
  updatedAt: z.string().nullable().describe('Last update timestamp.')
});

export let listChatbots = SlateTool.create(spec, {
  name: 'List Chatbots',
  key: 'list_chatbots',
  description: `Retrieve all chatbots associated with the authenticated account. Returns each chatbot's ID, name, type, and timestamps. Use the chatbot IDs with other tools to query, configure, or inspect specific chatbots.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      chatbots: z.array(chatbotSchema).describe('List of chatbots in the account.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listChatbots();

    let chatbots = Array.isArray(data) ? data : [];

    let mapped = chatbots.map((c: any) => ({
      chatbotId: c.id?.toString() ?? '',
      name: c.name ?? '',
      type: c.type ?? null,
      createdAt: c.created_at ?? null,
      updatedAt: c.updated_at ?? null
    }));

    return {
      output: {
        chatbots: mapped
      },
      message: `Found ${mapped.length} chatbot(s).`
    };
  })
  .build();
