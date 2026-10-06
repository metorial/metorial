import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let botQuery = SlateTool.create(spec, {
  name: 'Submit Question to Repository Owners',
  key: 'bot_query',
  description:
    'Submit a codebase question and conversation context to repository owners through Entelligence’s Slack integration. This sends an external message and does not generate an AI answer. Use chat_query for an AI response.',
  instructions: [
    'Use only when the user requests contacting the repository owners.',
    'Provide userEmail so the owners can contact the person asking the question.',
    'A successful submission confirms acceptance, not delivery or a reply.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      question: z.string().trim().min(1).describe('The question to send to repository owners'),
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']).describe('Role of the message sender'),
            content: z.string().describe('Message content')
          })
        )
        .optional()
        .describe('Previous conversation messages for multi-turn context'),
      userEmail: z
        .string()
        .optional()
        .describe('Contact email for the person asking the question')
    })
  )
  .output(
    z.object({
      answer: z.string().describe('Submission response text returned by the provider'),
      references: z.array(z.string()).describe('Source URLs, empty for owner submissions'),
      submitted: z.boolean().describe('Whether the provider accepted the owner submission')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      repoName: ctx.config.repoName,
      organization: ctx.config.organization
    });

    ctx.progress('Submitting question to repository owners...');

    let result = await client.sendSlackQuery({
      question: ctx.input.question,
      history: ctx.input.conversationHistory,
      userEmail: ctx.input.userEmail
    });

    return {
      output: result,
      message:
        'Entelligence accepted the question for submission to repository owners. This does not confirm delivery or a reply.'
    };
  })
  .build();
