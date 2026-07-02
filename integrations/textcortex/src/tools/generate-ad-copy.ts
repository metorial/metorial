import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateAdCopy = SlateTool.create(spec, {
  name: 'Generate Ad Copy',
  key: 'generate_ad_copy',
  description: `Generate advertising copy for a product or service. Produces creative ad text targeted at a specific audience segment. Useful for PPC ads, display ads, and marketing campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productName: z
        .string()
        .describe('Name or description of the product/service being advertised'),
      targetAudience: z
        .string()
        .optional()
        .describe(
          'Target audience or segment for the ad (e.g., "young professionals", "tech enthusiasts")'
        ),
      model: z
        .enum(['velox-1', 'alta-1', 'sophos-1', 'chat-sophos-1'])
        .optional()
        .describe('AI model to use'),
      maxTokens: z
        .number()
        .optional()
        .describe('Maximum number of tokens to generate (default: 512)'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Creativity level from 0 to 1. Default: 0.7'),
      generationCount: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Number of ad copy variations to generate (default: 1)'),
      sourceLang: z.string().optional().describe('Source language code or "auto"'),
      targetLang: z
        .string()
        .optional()
        .describe('Target language code for the generated ad copy')
    })
  )
  .output(
    z.object({
      adCopies: z
        .array(
          z.object({
            text: z.string().describe('Generated ad copy text'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated ad copies'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateAd({
      productName: ctx.input.productName,
      targetAudience: ctx.input.targetAudience,
      model: ctx.input.model,
      maxTokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      n: ctx.input.generationCount,
      sourceLang: ctx.input.sourceLang,
      targetLang: ctx.input.targetLang
    });

    let outputs = result.data.outputs;

    return {
      output: {
        adCopies: outputs.map(o => ({ text: o.text, index: o.index })),
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** ad copy variation(s) for "${ctx.input.productName}". Remaining credits: ${result.data.remaining_credits}.`
    };
  })
  .build();
