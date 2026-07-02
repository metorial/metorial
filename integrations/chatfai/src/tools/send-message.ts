import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Generate an AI-powered message reply from a ChatFAI character. Send a conversation to a character and receive a response in that character's style. Supports multi-turn conversations for contextual replies, and optionally allows overriding the character's name and bio.`,
  constraints: [
    'Each generated message consumes message credits from your account.',
    'All accounts are subject to a maximum number of messages per day.'
  ]
})
  .input(
    z.object({
      characterId: z.string().describe('ID of the public character to chat with'),
      conversation: z
        .array(
          z.object({
            role: z
              .enum(['user', 'assistant'])
              .describe(
                'Role of the message sender: "user" for the human, "assistant" for the character'
              ),
            content: z.string().describe('Text content of the message')
          })
        )
        .min(1)
        .describe(
          'Array of conversation messages providing context. The last message should be from the user.'
        ),
      characterName: z
        .string()
        .optional()
        .describe('Override or specify the character name for the conversation'),
      characterBio: z
        .string()
        .optional()
        .describe('Override or specify the character biography/personality prompt'),
      useInternalOptimizations: z
        .boolean()
        .optional()
        .describe('Enable or disable ChatFAI internal response optimizations')
    })
  )
  .output(
    z.object({
      reply: z.string().describe('The AI-generated reply from the character')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendMessage({
      characterId: ctx.input.characterId,
      conversation: ctx.input.conversation,
      name: ctx.input.characterName,
      bio: ctx.input.characterBio,
      useInternalOptimizations: ctx.input.useInternalOptimizations
    });

    return {
      output: {
        reply: result.reply
      },
      message: `Received reply from character **${ctx.input.characterId}**: "${result.reply.substring(0, 200)}${result.reply.length > 200 ? '...' : ''}"`
    };
  })
  .build();
