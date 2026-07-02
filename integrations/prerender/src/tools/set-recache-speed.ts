import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrerenderClient } from '../lib/client';
import { spec } from '../spec';

export let setRecacheSpeed = SlateTool.create(spec, {
  name: 'Set Recache Speed',
  key: 'set_recache_speed',
  description: `Control the speed at which Prerender recaches pages by setting the number of URLs rendered per hour. Higher values recache faster (up to 36,000/hour), lower values recache slower. Setting to 0 reverts to the automatic default. Returns recache metrics showing anticipated rendering frequency.`,
  constraints: [
    'Valid range: 0 (automatic default), or between 3,600 and 36,000 URLs per hour.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      urlsPerHour: z
        .number()
        .describe(
          'Number of URLs to recache per hour. Set to 0 for automatic default. Valid range: 0, or 3600–36000.'
        )
    })
  )
  .output(
    z.object({
      result: z
        .unknown()
        .describe('Response including recache metrics and anticipated rendering schedule.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrerenderClient({ token: ctx.auth.token });

    let result = await client.changeRecacheSpeed({
      urlsPerHour: ctx.input.urlsPerHour
    });

    let speedDescription =
      ctx.input.urlsPerHour === 0 ? 'automatic default' : `${ctx.input.urlsPerHour} URLs/hour`;

    return {
      output: {
        result
      },
      message: `Recache speed set to **${speedDescription}**.`
    };
  })
  .build();
