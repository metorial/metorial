import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGenerationStats = SlateTool.create(spec, {
  name: 'Get Generation Stats',
  key: 'get_generation_stats',
  description: `Retrieve detailed statistics for a specific generation by its ID, including token counts, cost, latency, and provider information. Useful for auditing usage, tracking costs, and debugging individual requests.`,
  instructions: ['The generation ID is returned as part of the chat completion response.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      generationId: z
        .string()
        .describe('The generation ID returned from a chat completion request')
    })
  )
  .output(
    z.object({
      generationId: z.string().describe('The generation ID'),
      model: z.string().optional().describe('Model used for this generation'),
      provider: z.string().optional().describe('Provider that served the request'),
      promptTokens: z.number().optional().describe('Number of prompt tokens'),
      completionTokens: z.number().optional().describe('Number of completion tokens'),
      totalTokens: z.number().optional().describe('Total tokens'),
      totalCost: z.number().optional().describe('Total cost in credits'),
      createdAt: z.string().optional().describe('When the generation was created'),
      latencyMs: z.number().optional().describe('Latency in milliseconds'),
      finishReason: z.string().optional().describe('Why generation stopped'),
      nativeTokensPrompt: z
        .number()
        .optional()
        .describe('Native prompt token count from the provider'),
      nativeTokensCompletion: z
        .number()
        .optional()
        .describe('Native completion token count from the provider')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let data = await client.getGenerationStats(ctx.input.generationId);

    let output = {
      generationId: (data.id as string) || ctx.input.generationId,
      model: (data.model as string) || undefined,
      provider: (data.provider as string) || undefined,
      promptTokens:
        (data.tokens_prompt as number) || (data.prompt_tokens as number) || undefined,
      completionTokens:
        (data.tokens_completion as number) || (data.completion_tokens as number) || undefined,
      totalTokens: (data.total_tokens as number) || undefined,
      totalCost: (data.total_cost as number) || (data.usage as number) || undefined,
      createdAt: data.created_at ? String(data.created_at) : undefined,
      latencyMs: (data.latency as number) || undefined,
      finishReason: (data.finish_reason as string) || undefined,
      nativeTokensPrompt: (data.native_tokens_prompt as number) || undefined,
      nativeTokensCompletion: (data.native_tokens_completion as number) || undefined
    };

    return {
      output,
      message: `Generation **${output.generationId}** on model **${output.model || 'unknown'}**: ${output.totalTokens || 'N/A'} tokens, cost: ${output.totalCost ?? 'N/A'} credits.`
    };
  })
  .build();
