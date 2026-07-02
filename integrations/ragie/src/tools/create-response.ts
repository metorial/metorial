import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createResponse = SlateTool.create(spec, {
  name: 'Create Response',
  key: 'create_response',
  description: `Generate an AI-powered answer using Ragie's deep-search agentic retrieval. The agent autonomously searches through your documents to find relevant information and synthesize a comprehensive answer with citations.
Best for complex questions that require multi-hop reasoning across multiple documents.`,
  instructions: [
    'Use reasoningEffort "low" for simple factual lookups, "medium" for moderately complex queries, and "high" for deep multi-hop reasoning.',
    'Provide optional instructions to guide the agent behavior and response format.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The question to answer using deep-search'),
      instructions: z
        .string()
        .optional()
        .describe('Optional guidance for the agent on how to search and respond'),
      reasoningEffort: z
        .enum(['low', 'medium', 'high'])
        .optional()
        .describe(
          'Reasoning depth: "low" for simple, "medium" for moderate, "high" for deep multi-hop'
        ),
      partition: z
        .string()
        .optional()
        .describe('Partition to scope retrieval to. Overrides default partition from config.')
    })
  )
  .output(
    z.object({
      responseId: z.string().optional().describe('Response ID'),
      answer: z.string().describe('The generated answer'),
      rawResponse: z.any().optional().describe('Full response object from Ragie')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    let result = await client.createResponse({
      input: ctx.input.query,
      instructions: ctx.input.instructions,
      reasoningEffort: ctx.input.reasoningEffort,
      partition: ctx.input.partition
    });

    let answer = '';
    if (result.output) {
      if (typeof result.output === 'string') {
        answer = result.output;
      } else if (Array.isArray(result.output)) {
        answer = result.output
          .filter((item: any) => item.type === 'message' && item.content)
          .map((item: any) => {
            if (Array.isArray(item.content)) {
              return item.content
                .filter((c: any) => c.type === 'output_text')
                .map((c: any) => c.text)
                .join('');
            }
            return typeof item.content === 'string' ? item.content : '';
          })
          .join('\n');
      }
    }

    if (!answer && result.text) {
      answer = result.text;
    }

    return {
      output: {
        responseId: result.id,
        answer: answer || JSON.stringify(result),
        rawResponse: result
      },
      message: `Generated response for: "${ctx.input.query}"\n\n${answer.substring(0, 500)}${answer.length > 500 ? '...' : ''}`
    };
  })
  .build();
