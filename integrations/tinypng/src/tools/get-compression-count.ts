import { SlateTool } from 'slates';
import { z } from 'zod';
import { TinifyClient } from '../lib/client';
import { spec } from '../spec';

export let getCompressionCount = SlateTool.create(spec, {
  name: 'Get Compression Count',
  key: 'get_compression_count',
  description: `Retrieve the number of compressions performed during the current calendar month. Useful for monitoring API usage against the monthly limit (500 free compressions per month).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      compressionCount: z
        .number()
        .describe('Number of compressions made during the current calendar month')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TinifyClient(ctx.auth.token);

    let compressionCount = await client.getCompressionCount();

    return {
      output: {
        compressionCount
      },
      message: `Monthly compression count: **${compressionCount}** / 500 free.`
    };
  })
  .build();
