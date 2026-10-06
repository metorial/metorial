import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { safeJson } from '../lib/contracts';
import { spec } from '../spec';

export let getRelationships = SlateTool.create(spec, {
  name: 'Get IoC Relationships',
  key: 'get_relationships',
  description: `Retrieve relationships for any VirusTotal indicator (file, URL, domain, or IP address). Allows pivoting across IoCs to map threat campaigns and infrastructure.

Common relationship types:
- **Files:** contacted_domains, contacted_ips, contacted_urls, embedded_domains, embedded_ips, itw_urls, execution_parents, compressed_parents, bundled_files, pe_resource_parents
- **Domains:** communicating_files, downloaded_files, referrer_files, resolutions, siblings, subdomains, urls
- **IPs:** communicating_files, downloaded_files, referrer_files, resolutions, urls
- **URLs:** contacted_domains, contacted_ips, downloaded_files, redirecting_urls, redirects_to, referrer_urls`,
  constraints: [
    'Use non-sensitive public indicators; submitted or queried indicators may be scanned and included in the community dataset.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z.enum(['file', 'url', 'domain', 'ip']).describe('Type of resource'),
      resourceId: z
        .string()
        .describe('Resource identifier (file hash, URL id, domain, or IP address)'),
      relationship: z
        .string()
        .describe(
          'Relationship type to retrieve (e.g. "contacted_domains", "communicating_files")'
        ),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of related items to return'),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .output(
    z.object({
      relatedItems: z
        .array(
          z.object({
            itemId: z.string().describe('ID of the related item'),
            itemType: z.string().optional().describe('Type of the related item'),
            errorCode: z
              .string()
              .optional()
              .describe('Native availability error for this related object'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Attributes of the related item')
          })
        )
        .describe('List of related items'),
      nextCursor: z.string().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    safeJson(ctx.input, [ctx.auth.token]);
    let client = new Client(ctx.auth);

    let result: Awaited<ReturnType<Client['getFileRelationships']>> | undefined;
    switch (ctx.input.resourceType) {
      case 'file':
        result = await client.getFileRelationships(
          ctx.input.resourceId,
          ctx.input.relationship,
          ctx.input.limit,
          ctx.input.cursor
        );
        break;
      case 'url':
        result = await client.getUrlRelationships(
          ctx.input.resourceId,
          ctx.input.relationship,
          ctx.input.limit,
          ctx.input.cursor
        );
        break;
      case 'domain':
        result = await client.getDomainRelationships(
          ctx.input.resourceId,
          ctx.input.relationship,
          ctx.input.limit,
          ctx.input.cursor
        );
        break;
      case 'ip':
        result = await client.getIpRelationships(
          ctx.input.resourceId,
          ctx.input.relationship,
          ctx.input.limit,
          ctx.input.cursor
        );
        break;
    }

    let relatedItems = (result?.data ?? []).map(item => ({
      itemId: item.id,
      itemType: item.type,
      errorCode: item.error?.code,
      attributes: item.attributes
    }));

    return {
      output: {
        relatedItems,
        nextCursor: result?.meta?.cursor
      },
      message: `Found **${relatedItems.length}** related items for ${ctx.input.resourceType} \`${ctx.input.resourceId}\` (relationship: ${ctx.input.relationship}).`
    };
  })
  .build();
