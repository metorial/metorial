import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateProductDescription = SlateTool.create(spec, {
  name: 'Generate Product Description',
  key: 'generate_product_description',
  description: `Generate product descriptions given a product name and optional details like category, brand, and features. Ideal for e-commerce listings and product marketing content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productName: z.string().describe('Name of the product'),
      productCategory: z
        .string()
        .optional()
        .describe('Product category (e.g., "Electronics", "Clothing")'),
      brand: z.string().optional().describe('Brand name'),
      productFeatures: z
        .array(z.string())
        .optional()
        .describe('List of product features or selling points'),
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
        .describe('Number of description variations to generate (default: 1)'),
      sourceLang: z.string().optional().describe('Source language code or "auto"'),
      targetLang: z
        .string()
        .optional()
        .describe('Target language code for the generated description')
    })
  )
  .output(
    z.object({
      descriptions: z
        .array(
          z.object({
            text: z.string().describe('Generated product description'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated product descriptions'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateProductDescription({
      productName: ctx.input.productName,
      productCategory: ctx.input.productCategory,
      brand: ctx.input.brand,
      productFeatures: ctx.input.productFeatures,
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
        descriptions: outputs.map(o => ({ text: o.text, index: o.index })),
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** product description(s) for "${ctx.input.productName}". Remaining credits: ${result.data.remaining_credits}.`
    };
  })
  .build();
