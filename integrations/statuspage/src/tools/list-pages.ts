import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export let listPages = SlateTool.create(spec, {
  key: 'list_pages',
  name: 'List Pages',
  description:
    'Discover status pages accessible to the API key, including IDs for page-scoped operations. This lists accessible pages, not the identity of an account user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      pages: z.array(
        z.object({
          pageId: z.string(),
          name: z.string().optional(),
          subdomain: z.string().optional(),
          domain: z.string().optional(),
          websiteUrl: z.string().optional(),
          viewersMustBeTeamMembers: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const pages = (await new Client({ token: ctx.auth.token }).listPages()).map(page => ({
      pageId: page.id,
      name: page.name,
      subdomain: page.subdomain,
      domain: page.domain,
      websiteUrl: page.url,
      viewersMustBeTeamMembers: page.viewers_must_be_team_members
    }));
    return { output: { pages }, message: `Found ${pages.length} accessible status page(s).` };
  })
  .build();
