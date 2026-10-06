import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { usageSchema } from '../lib/types';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve usage statistics for the Cloudinary product environment, including storage, bandwidth, transformations, and other resource consumption metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z
        .string()
        .optional()
        .describe(
          'Specific date within the last three months (YYYY-MM-DD). Defaults to current date.'
        )
    })
  )
  .output(usageSchema)
  .handleInvocation(async ctx => {
    const usage = await createClient(ctx).getUsage(ctx.input.date);
    return {
      output: usage,
      message: `Retrieved Cloudinary usage statistics${ctx.input.date ? ` for ${ctx.input.date}` : ''}. Missing metrics are omitted; figures update periodically.`
    };
  })
  .build();
