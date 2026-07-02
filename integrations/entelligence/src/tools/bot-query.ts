import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let botQuery = SlateTool.create(spec, {
  name: 'Bot Query',
  key: 'bot_query',
  description: `Send a query through the Entelligence bot interface. This is useful for automated or integration-based queries where you need to associate a response with a specific user email. Supports conversation history for multi-turn interactions.`,
  instructions: [
    'Provide a userEmail to associate the query with a specific user for tracking purposes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      question: z.string().describe('The question to ask about the codebase'),
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
        .describe('Email address of the user making the query for tracking')
    })
  )
  .output(
    z.object({
      answer: z.string().describe('AI-generated answer to the question'),
      references: z.array(z.string()).describe('Source reference URLs cited in the answer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      repoName: ctx.config.repoName,
      organization: ctx.config.organization
    });

    ctx.progress('Sending bot query...');

    let result = await client.sendSlackQuery({
      question: ctx.input.question,
      history: ctx.input.conversationHistory,
      userEmail: ctx.input.userEmail
    });

    return {
      output: result,
      message: `**Answer:**\n\n${result.answer}`
    };
  })
  .build();
