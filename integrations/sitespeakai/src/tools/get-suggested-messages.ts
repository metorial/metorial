import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suggestedMessageSchema = z.object({
  promptId: z.string().describe('Suggested message identifier.'),
  chatbotId: z.string().describe('Associated chatbot ID.'),
  name: z.string().describe('Display name for the suggested message.'),
  prompt: z.string().describe('The suggested message text shown to visitors.'),
  type: z.string().nullable().describe('Prompt type (e.g. "ai").'),
  action: z.string().nullable().describe('Associated action, if any.'),
  createdAt: z.string().nullable().describe('Creation timestamp.'),
  updatedAt: z.string().nullable().describe('Last update timestamp.')
});

export let getSuggestedMessages = SlateTool.create(spec, {
  name: 'Get Suggested Messages',
  key: 'get_suggested_messages',
  description: `Retrieve the suggested messages (prompts) configured for a chatbot. These are pre-defined questions shown to visitors to guide them toward relevant content and common topics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('The ID of the chatbot.')
    })
  )
  .output(
    z.object({
      suggestedMessages: z
        .array(suggestedMessageSchema)
        .describe('List of suggested messages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getSuggestedMessages(ctx.input.chatbotId);

    let prompts = Array.isArray(data) ? data : [];

    let mapped = prompts.map((p: any) => ({
      promptId: p.id?.toString() ?? '',
      chatbotId: p.chatbot_id?.toString() ?? '',
      name: p.name ?? '',
      prompt: p.prompt ?? '',
      type: p.type ?? null,
      action: p.action ?? null,
      createdAt: p.created_at ?? null,
      updatedAt: p.updated_at ?? null
    }));

    return {
      output: {
        suggestedMessages: mapped
      },
      message: `Retrieved ${mapped.length} suggested message(s).`
    };
  })
  .build();
