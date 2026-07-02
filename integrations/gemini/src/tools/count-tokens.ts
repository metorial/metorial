import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let countTokens = SlateTool.create(spec, {
  name: 'Count Tokens',
  key: 'count_tokens',
  description: `Count the number of tokens in text content for a specific Gemini model. Useful for estimating costs and ensuring prompts fit within model token limits before sending generation requests.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z.string().describe('Model ID to count tokens for (e.g. "gemini-2.0-flash")'),
      text: z.string().describe('Text content to count tokens for')
    })
  )
  .output(
    z.object({
      totalTokens: z.number().describe('Total number of tokens in the content'),
      totalBillableCharacters: z.number().optional().describe('Total billable characters')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.countTokens(ctx.input.model, {
      contents: [{ parts: [{ text: ctx.input.text }] }]
    });

    return {
      output: {
        totalTokens: result.totalTokens ?? 0,
        totalBillableCharacters: result.totalBillableCharacters
      },
      message: `Counted **${result.totalTokens ?? 0}** tokens for model **${ctx.input.model}**.`
    };
  })
  .build();
