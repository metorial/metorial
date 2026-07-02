import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchConsoleClient } from '../lib/client';
import { googleSearchConsoleActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageSite = SlateTool.create(spec, {
  name: 'Manage Site',
  key: 'manage_site',
  description: `Add or remove a site property from Google Search Console. Use the "add" action to register a new site property, or "remove" to delete an existing one. You can also use "get" to retrieve details of a specific site property.`,
  instructions: [
    'The siteUrl must be a URL-prefix (e.g., "http://www.example.com/") or a domain property (e.g., "sc-domain:example.com").',
    'Adding a site does not automatically verify ownership — verification must be completed separately.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(googleSearchConsoleActionScopes.manageSite)
  .input(
    z.object({
      action: z
        .enum(['add', 'remove', 'get'])
        .describe('Action to perform on the site property'),
      siteUrl: z
        .string()
        .describe('The site URL (e.g., "http://www.example.com/" or "sc-domain:example.com")')
    })
  )
  .output(
    z.object({
      siteUrl: z.string().describe('The site URL'),
      permissionLevel: z
        .string()
        .optional()
        .describe('User permission level (returned for "get" and "add" actions)'),
      actionPerformed: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchConsoleClient(ctx.auth.token);
    let { action, siteUrl } = ctx.input;

    if (action === 'add') {
      await client.addSite(siteUrl);
      return {
        output: {
          siteUrl,
          actionPerformed: 'added'
        },
        message: `Site **${siteUrl}** has been added to Search Console.`
      };
    }

    if (action === 'remove') {
      await client.deleteSite(siteUrl);
      return {
        output: {
          siteUrl,
          actionPerformed: 'removed'
        },
        message: `Site **${siteUrl}** has been removed from Search Console.`
      };
    }

    // action === 'get'
    let site = await client.getSite(siteUrl);
    return {
      output: {
        siteUrl: site.siteUrl,
        permissionLevel: site.permissionLevel,
        actionPerformed: 'retrieved'
      },
      message: `Site **${site.siteUrl}** — permission level: **${site.permissionLevel}**.`
    };
  })
  .build();
