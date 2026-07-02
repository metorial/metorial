import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let moderateContent = SlateTool.create(spec, {
  name: 'Moderate Content',
  key: 'moderate_content',
  description: `Evaluate text content for safety and policy compliance using Groq's moderation models. Supports custom safety policies with GPT-OSS-Safeguard and prompt injection detection with Llama Prompt Guard models.`,
  instructions: [
    'For custom policy enforcement, use the "openai/gpt-oss-safeguard-20b" model and provide your policy in the system prompt.',
    'For prompt injection detection, use "meta-llama/llama-prompt-guard-2-86m" or "meta-llama/llama-prompt-guard-2-22m".',
    'The model responds with its moderation assessment based on the policy or detection task provided.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('Text content to evaluate for moderation'),
      model: z
        .string()
        .default('openai/gpt-oss-safeguard-20b')
        .describe('Moderation model to use'),
      policy: z
        .string()
        .optional()
        .describe(
          'Custom safety policy for GPT-OSS-Safeguard. Define what constitutes violations vs. safe content'
        ),
      systemPrompt: z
        .string()
        .optional()
        .describe(
          'System prompt for the moderation model. Used when not providing a separate policy'
        )
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      assessment: z.string().nullable().describe('Moderation assessment from the model'),
      model: z.string().describe('Model used for moderation'),
      promptTokens: z.number().describe('Number of tokens in the prompt'),
      completionTokens: z.number().describe('Number of tokens in the completion'),
      totalTokens: z.number().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }> =
      [];

    if (ctx.input.policy) {
      messages.push({
        role: 'system',
        content: ctx.input.policy
      });
    } else if (ctx.input.systemPrompt) {
      messages.push({
        role: 'system',
        content: ctx.input.systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: ctx.input.content
    });

    let result = await client.createChatCompletion({
      model: ctx.input.model,
      messages
    });

    let choice = result.choices[0];

    return {
      output: {
        completionId: result.id,
        assessment: choice?.message?.content ?? null,
        model: result.model,
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens
      },
      message: `Content moderation completed using **${result.model}**. Used ${result.usage.total_tokens} tokens.`
    };
  })
  .build();
