import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTaxonomy = SlateTool.create(spec, {
  name: 'Get Discovery Taxonomy',
  key: 'get_taxonomy',
  description:
    'Retrieve the category, thematic, label, and interest IDs grouped by social network. Use these IDs to choose category filters for discover_influencers and interpret influencer reports.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      taxonomy: z
        .any()
        .describe('Taxonomy grouped by network, including category IDs and titles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });
    let response = await client.getTaxonomy();
    return {
      output: { taxonomy: response?.result ?? response },
      message: 'Retrieved the influencer discovery taxonomy.'
    };
  })
  .build();
