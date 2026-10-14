import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description:
    'List the GoSquared projects owned by or shared with the connected account. Use the returned project tokens to select a project for analytics, tracking, and People operations.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      sites: z.any().describe('Accessible projects in the provider flat presentation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({ token: ctx.auth.token });
    let sites = await client.getSites();
    return {
      output: { sites },
      message: 'Retrieved the projects accessible to this account.'
    };
  })
  .build();
