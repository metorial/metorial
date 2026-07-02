import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `List all Facebook Pages that the authenticated user manages. Returns page details including name, category, follower count, and page link. Requires the \`pages_show_list\` permission.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      pages: z
        .array(
          z.object({
            pageId: z.string().describe('Facebook Page ID'),
            name: z.string().describe('Page name'),
            category: z.string().optional().describe('Page category'),
            fanCount: z.number().optional().describe('Number of likes/fans'),
            followersCount: z.number().optional().describe('Number of followers'),
            link: z.string().optional().describe('URL to the Page'),
            pictureUrl: z.string().optional().describe('URL of the Page profile picture')
          })
        )
        .describe('List of managed Pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let pages = await client.getMyPages();

    return {
      output: {
        pages: pages.map(p => ({
          pageId: p.id,
          name: p.name,
          category: p.category,
          fanCount: p.fan_count,
          followersCount: p.followers_count,
          link: p.link,
          pictureUrl: p.picture?.data?.url
        }))
      },
      message: `Found **${pages.length}** managed page(s).`
    };
  })
  .build();
