import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAlias = SlateTool.create(spec, {
  name: 'Get Short URL Details',
  key: 'get_alias',
  description: `Retrieves full details of a shortened URL including its destinations, meta tags, snippets, and timestamps. Useful for inspecting the current configuration of an alias.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      aliasName: z
        .string()
        .describe('The alias path to look up (e.g., "my-link" or "aBcDe012").'),
      domainName: z
        .string()
        .optional()
        .describe('The domain the alias belongs to. Defaults to "short.fyi" if omitted.')
    })
  )
  .output(
    z.object({
      aliasName: z.string().describe('The alias path.'),
      domainName: z.string().describe('The domain the alias belongs to.'),
      createdAt: z.string().describe('ISO timestamp when the alias was created.'),
      updatedAt: z.string().describe('ISO timestamp when the alias was last updated.'),
      destinations: z
        .array(
          z.object({
            url: z.string().describe('The destination URL.'),
            country: z.string().optional().describe('Country code for geo-targeting.'),
            os: z.string().optional().describe('Operating system for OS-targeting.')
          })
        )
        .describe('Configured destination URLs with optional targeting.'),
      metatags: z
        .array(
          z.object({
            name: z.string().describe('Meta tag name.'),
            content: z.string().describe('Meta tag content.')
          })
        )
        .describe('Custom meta tags for social sharing.'),
      snippets: z
        .array(
          z.object({
            snippetId: z.string().describe('Snippet identifier.'),
            parameters: z
              .record(z.string(), z.string())
              .optional()
              .describe('Snippet parameters.')
          })
        )
        .describe('Tracking pixel snippets.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let alias = await client.getAlias({
      aliasName: ctx.input.aliasName,
      domainName: ctx.input.domainName
    });

    let output = {
      aliasName: alias.name,
      domainName: alias.domainName,
      createdAt: new Date(alias.createdAt).toISOString(),
      updatedAt: new Date(alias.updatedAt).toISOString(),
      destinations: alias.destinations.map(d => ({
        url: d.url,
        country: d.country,
        os: d.os
      })),
      metatags: alias.metatags.map(m => ({
        name: m.name,
        content: m.content
      })),
      snippets: alias.snippets.map(s => ({
        snippetId: s.id,
        parameters: s.parameters
      }))
    };

    let defaultDest = alias.destinations.find(d => !d.country && !d.os);
    let destSummary = defaultDest ? defaultDest.url : alias.destinations[0]?.url || 'N/A';

    return {
      output,
      message: `Alias \`${alias.name}\` on \`${alias.domainName}\` redirects to ${destSummary} with ${alias.destinations.length} destination(s), ${alias.metatags.length} meta tag(s), and ${alias.snippets.length} snippet(s).`
    };
  })
  .build();
