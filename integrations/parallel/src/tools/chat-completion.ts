import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let chatCompletion = SlateTool.create(spec, {
  name: 'Chat Completion',
  key: 'chat_completion',
  description: `Send messages to Parallel's web-grounded chat completions API and receive AI responses with optional citations.
Supports multiple models: **speed** for low-latency responses, and **lite**/**base**/**core** for deeper research with citations.
Compatible with the OpenAI chat completions format.`,
  instructions: [
    'Use the speed model for quick answers (~3s latency).',
    'Use lite/base/core models when you need citations and evidence-based answers.',
    'Use responseFormat with a JSON schema to get structured output.',
    'Use previousInteractionId to continue a conversation with context from a prior interaction.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .enum(['speed', 'lite', 'base', 'core'])
        .describe('Model to use. speed is fastest, core is most thorough with citations.'),
      messages: z
        .array(
          z.object({
            role: z.enum(['system', 'user', 'assistant']).describe('Message role'),
            content: z.string().describe('Message content')
          })
        )
        .describe('Conversation messages in OpenAI format'),
      responseFormat: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON schema for structured output'),
      previousInteractionId: z
        .string()
        .optional()
        .describe('Interaction ID from a prior chat to continue the conversation')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique completion ID'),
      model: z.string().describe('Model used'),
      content: z.string().describe('Generated response content'),
      finishReason: z.string().describe('Why the response ended (e.g. stop)'),
      usage: z
        .object({
          promptTokens: z.number().describe('Input tokens consumed'),
          completionTokens: z.number().describe('Output tokens generated'),
          totalTokens: z.number().describe('Total tokens used')
        })
        .describe('Token usage'),
      basis: z
        .array(
          z.object({
            citations: z
              .array(
                z.object({
                  url: z.string().describe('Source URL'),
                  excerpts: z.array(z.string()).describe('Supporting excerpts')
                })
              )
              .describe('Citations'),
            reasoning: z.string().describe('Reasoning explanation'),
            confidence: z.string().describe('Confidence level')
          })
        )
        .nullable()
        .describe('Citations and reasoning (available for lite/base/core models)'),
      interactionId: z.string().describe('Interaction ID for follow-up chats')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.chatCompletion({
      model: ctx.input.model,
      messages: ctx.input.messages,
      responseFormat: ctx.input.responseFormat,
      previousInteractionId: ctx.input.previousInteractionId
    });

    let content = result.choices[0]?.delta?.content ?? '';
    let finishReason = result.choices[0]?.finishReason ?? 'stop';

    return {
      output: {
        completionId: result.completionId,
        model: result.model,
        content,
        finishReason,
        usage: result.usage,
        basis: result.basis,
        interactionId: result.interactionId
      },
      message: `Chat completion generated using model **${result.model}** (${result.usage.totalTokens} tokens).`
    };
  })
  .build();
