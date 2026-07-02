import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { assemblyAiServiceError } from '../lib/errors';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z
    .enum(['system', 'user', 'assistant', 'tool'])
    .describe('Message role for the LLM Gateway request.'),
  content: z.string().describe('Message content.')
});

export let createChatCompletion = SlateTool.create(spec, {
  name: 'Create Chat Completion',
  key: 'create_chat_completion',
  description: `Create a completion with AssemblyAI's LLM Gateway. Use prompt for a simple request, or messages for a conversation. Provide transcriptId to inject an AssemblyAI transcript into the first {{ transcript }} tag in the prompt.`,
  instructions: [
    'Provide either prompt or messages.',
    'To analyze a transcript, set transcriptId and include {{ transcript }} in the prompt.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('LLM Gateway model ID, such as "claude-sonnet-4-5-20250929".'),
      prompt: z
        .string()
        .optional()
        .describe('Simple prompt. Use {{ transcript }} to inject transcriptId text.'),
      messages: z
        .array(messageSchema)
        .optional()
        .describe('Conversation messages. Alternative to prompt.'),
      transcriptId: z
        .string()
        .optional()
        .describe(
          'AssemblyAI transcript ID whose text replaces the first {{ transcript }} tag in prompt.'
        ),
      modelRegion: z
        .enum(['global'])
        .optional()
        .describe('Route supported models to the provider global endpoint.'),
      maxTokens: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Maximum output tokens. Defaults to AssemblyAI LLM Gateway default.'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Controls randomness. Lower values are more deterministic.')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('AssemblyAI LLM Gateway request ID.'),
      content: z.string().optional().nullable().describe('First response message content.'),
      choices: z
        .array(
          z.object({
            role: z.string().optional().nullable(),
            content: z.string().optional().nullable(),
            finishReason: z.string().optional().nullable()
          })
        )
        .describe('Returned completion choices.'),
      usage: z
        .object({
          inputTokens: z.number().optional(),
          outputTokens: z.number().optional(),
          totalTokens: z.number().optional()
        })
        .optional()
        .describe('Token usage when returned by the LLM Gateway.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.prompt && !ctx.input.messages?.length) {
      throw assemblyAiServiceError('Provide either prompt or messages.');
    }

    if (ctx.input.prompt && ctx.input.messages?.length) {
      throw assemblyAiServiceError('Provide either prompt or messages, not both.');
    }

    if (ctx.input.transcriptId && !ctx.input.prompt?.includes('{{ transcript }}')) {
      throw assemblyAiServiceError(
        'prompt must include {{ transcript }} when transcriptId is provided.'
      );
    }

    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.createChatCompletion(ctx.input);
    let choices = (result.choices || []).map((choice: any) => ({
      role: choice.message?.role ?? null,
      content: choice.message?.content ?? null,
      finishReason: choice.finish_reason ?? null
    }));

    return {
      output: {
        requestId: result.request_id,
        content: choices[0]?.content ?? null,
        choices,
        usage: result.usage
          ? {
              inputTokens: result.usage.input_tokens,
              outputTokens: result.usage.output_tokens,
              totalTokens: result.usage.total_tokens
            }
          : undefined
      },
      message: `Created AssemblyAI LLM Gateway completion **${result.request_id}**.`
    };
  })
  .build();
