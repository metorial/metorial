import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { idStatusOutputShape } from './shared';

export let getExtractStatusTool = SlateTool.create(spec, {
  name: 'Get Extract Status',
  key: 'get_extract_status',
  description: `Check a Firecrawl extract job and retrieve structured data when complete.`,
  instructions: [
    'Provide the extractId returned by Extract Data.',
    'If status is processing, poll again later.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      extractId: z.string().describe('The ID of the extract job to check')
    })
  )
  .output(
    z.object({
      ...idStatusOutputShape,
      extractedData: z
        .any()
        .optional()
        .describe('The extracted structured data, available when completed'),
      tokensUsed: z.number().optional().describe('Tokens consumed by extraction')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getExtractStatus(ctx.input.extractId);

    return {
      output: {
        status: result.status,
        success: result.success,
        extractedData: result.data,
        tokensUsed: result.tokensUsed,
        expiresAt: result.expiresAt
      },
      message: `Extract job \`${ctx.input.extractId}\` is **${result.status}**.`
    };
  });
