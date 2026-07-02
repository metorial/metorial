import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchConsoleClient } from '../lib/client';
import { googleSearchConsoleActionScopes } from '../scopes';
import { spec } from '../spec';

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `List all site properties available in Google Search Console for the authenticated user. Returns each site's URL and the user's permission level.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleSearchConsoleActionScopes.listSites)
  .input(z.object({}))
  .output(
    z.object({
      sites: z
        .array(
          z.object({
            siteUrl: z.string().describe('The URL of the site property'),
            permissionLevel: z
              .string()
              .describe(
                'User permission level: siteOwner, siteFullUser, siteRestrictedUser, or siteUnverifiedUser'
              )
          })
        )
        .describe('List of site properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchConsoleClient(ctx.auth.token);
    let sites = await client.listSites();

    return {
      output: { sites },
      message: `Found **${sites.length}** site${sites.length === 1 ? '' : 's'} in Search Console.`
    };
  })
  .build();
