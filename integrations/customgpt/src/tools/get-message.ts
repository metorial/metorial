import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description:
    'Retrieve the complete details of one conversation message, including its prompt, response, citations, and available metadata. Use get_messages to discover the prompt ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z
        .number()
        .refine(
          value => Number.isSafeInteger(value) && value > 0,
          'Must be a positive whole number'
        )
        .describe('Agent ID. Use list_agents to discover agents.'),
      sessionId: z
        .string()
        .min(1)
        .describe('Conversation session ID. Use list_conversations to discover sessions.'),
      promptId: z
        .number()
        .refine(
          value => Number.isSafeInteger(value) && value > 0,
          'Must be a positive whole number'
        )
        .describe('Message prompt ID. Use get_messages to discover messages.'),
      includeInsights: z
        .boolean()
        .optional()
        .describe('Include customer intelligence when lead capture is enabled for this agent.')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Agent ID'),
      sessionId: z.string().describe('Conversation session ID'),
      promptId: z.number().describe('Requested message prompt ID'),
      details: z
        .record(z.string(), z.unknown())
        .describe('Complete message details returned by CustomGPT')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });
    let details = await client.getMessageDetails(
      ctx.input.projectId,
      ctx.input.sessionId,
      ctx.input.promptId,
      ctx.input.includeInsights
    );
    return {
      output: {
        projectId: ctx.input.projectId,
        sessionId: ctx.input.sessionId,
        promptId: ctx.input.promptId,
        details
      },
      message: `Retrieved message **${ctx.input.promptId}** from conversation **${ctx.input.sessionId}**.`
    };
  })
  .build();
