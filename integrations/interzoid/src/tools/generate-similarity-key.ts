import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateSimilarityKey = SlateTool.create(spec, {
  name: 'Generate Similarity Key',
  key: 'generate_similarity_key',
  description: `Generate an AI-powered similarity key for a data value so that similar values (e.g., "IBM" and "International Business Machines") produce the same key. Useful for **deduplication**, **fuzzy matching**, and **record linkage** across datasets.

Supports company/organization names, individual full names, US street addresses, global addresses, and product names.`,
  instructions: [
    'Choose the appropriate category for your data type.',
    'For company and address matching, select an algorithm. "model-v4-wide" is recommended for companies; "ai-medium-wide" for addresses.',
    'Compare similarity keys across records — matching keys indicate likely duplicates.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      category: z
        .enum(['company', 'full_name', 'us_address', 'global_address', 'product'])
        .describe('The type of data to generate a similarity key for'),
      value: z.string().describe('The data value to generate a similarity key for'),
      algorithm: z
        .string()
        .optional()
        .describe(
          'Matching algorithm. For company: wide, narrow, model-v4-wide (recommended), model-v4-narrow. For address: model-v3-wide, model-v3-narrow, ai-medium-wide, ai-medium-narrow. For product: ai-medium-wide (recommended), ai-medium-narrow. Not used for full_name.'
        )
    })
  )
  .output(
    z.object({
      similarityKey: z.string().describe('The generated similarity key hash'),
      code: z.string().describe('API response status code'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result: { SimKey: string; Code: string; Credits: number };

    switch (ctx.input.category) {
      case 'company':
        result = await client.getCompanyMatch(
          ctx.input.value,
          ctx.input.algorithm ?? 'model-v4-wide'
        );
        break;
      case 'full_name':
        result = await client.getFullNameMatch(ctx.input.value);
        break;
      case 'us_address':
        result = await client.getAddressMatch(
          ctx.input.value,
          ctx.input.algorithm ?? 'model-v3-wide'
        );
        break;
      case 'global_address':
        result = await client.getGlobalAddressMatch(
          ctx.input.value,
          ctx.input.algorithm ?? 'ai-medium-wide'
        );
        break;
      case 'product':
        result = await client.getProductMatch(
          ctx.input.value,
          ctx.input.algorithm ?? 'ai-medium-wide'
        );
        break;
    }

    return {
      output: {
        similarityKey: result.SimKey,
        code: result.Code,
        remainingCredits: result.Credits
      },
      message: `Generated similarity key for ${ctx.input.category} "${ctx.input.value}": \`${result.SimKey}\``
    };
  })
  .build();
