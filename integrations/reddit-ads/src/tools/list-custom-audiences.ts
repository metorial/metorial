import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomAudiences = SlateTool.create(spec, {
  name: 'List Custom Audiences',
  key: 'list_custom_audiences',
  description: `Retrieve all custom audiences for the configured Reddit Ads account. Returns audience names, types, sizes, and statuses. Useful for reviewing available targeting audiences before creating campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      audiences: z.array(
        z.object({
          audienceId: z.string().optional(),
          name: z.string().optional(),
          audienceType: z.string().optional(),
          approximateSize: z.number().optional(),
          status: z.string().optional(),
          raw: z.any().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let audiences = await client.listCustomAudiences();

    let mapped = (Array.isArray(audiences) ? audiences : []).map((a: any) => ({
      audienceId: a.id || a.audience_id,
      name: a.name,
      audienceType: a.type,
      approximateSize: a.approximate_size || a.size,
      status: a.status,
      raw: a
    }));

    return {
      output: { audiences: mapped },
      message: `Found **${mapped.length}** custom audience(s).`
    };
  })
  .build();
