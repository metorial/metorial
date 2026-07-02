import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taxonomySchema = z.object({
  taxonomyId: z.number().describe('Unique taxonomy ID'),
  name: z.string().describe('Taxonomy name (e.g., "sports", "concert", "theater")'),
  parentId: z.number().nullable().describe('Parent taxonomy ID, null for top-level taxonomies')
});

export let getTaxonomies = SlateTool.create(spec, {
  name: 'Get Taxonomies',
  key: 'get_taxonomies',
  description: `Retrieve the full list of event category taxonomies from SeatGeek. Taxonomies are hierarchical (parent-child) and used to categorize events and performers (e.g., sports, concerts, theater, comedy). Useful for discovering available categories and their IDs for filtering events and performers.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      taxonomies: z.array(taxonomySchema).describe('List of all taxonomies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      affiliateId: ctx.config.affiliateId,
      referralId: ctx.config.referralId
    });

    let response = await client.getTaxonomies();

    let taxonomies = response.taxonomies.map(t => ({
      taxonomyId: t.id,
      name: t.name,
      parentId: t.parent_id
    }));

    let topLevel = taxonomies.filter(t => t.parentId === null);
    let summaryParts = [
      `Retrieved **${taxonomies.length}** taxonomies (${topLevel.length} top-level categories)`
    ];
    summaryParts.push('\n\nTop-level categories:');
    for (let t of topLevel) {
      let children = taxonomies.filter(c => c.parentId === t.taxonomyId);
      let childStr = children.length > 0 ? ` (${children.length} subcategories)` : '';
      summaryParts.push(`- **${t.name}** (ID: ${t.taxonomyId})${childStr}`);
    }

    return {
      output: { taxonomies },
      message: summaryParts.join('\n')
    };
  })
  .build();
