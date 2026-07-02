import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let linkSummarySchema = z.object({
  linkId: z.number().describe('Unique link ID'),
  title: z.string().optional().describe('Link title'),
  targetType: z.string().optional().describe('Link type (music, podcast, event, etc.)'),
  targetUrl: z.string().optional().describe('Destination URL'),
  shortenedPath: z.string().optional().describe('Short URL path segment'),
  subdomain: z.string().optional().describe('Subdomain for the link'),
  clickCount: z.number().optional().describe('Total click count'),
  clickthroughCount: z.number().optional().describe('Total clickthrough count')
});

export let listLinks = SlateTool.create(spec, {
  name: 'List FanLinks',
  key: 'list_links',
  description: `List all smart links (FanLinks) for the authenticated user profile. Supports filtering by link type and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      targetType: z
        .enum([
          'music',
          'podcast',
          'livestream',
          'event',
          'tour',
          'biglink',
          'fundraiser',
          'smartlink',
          'custom'
        ])
        .optional()
        .describe('Filter links by type'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of links to return')
    })
  )
  .output(
    z.object({
      links: z.array(linkSummarySchema).describe('List of FanLinks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let links = await client.listLinks('me', {
      targetType: ctx.input.targetType,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let mapped = (links || []).map((l: any) => ({
      linkId: l.id,
      title: l.title,
      targetType: l.target_type,
      targetUrl: l.target_url,
      shortenedPath: l.shortened_path,
      subdomain: l.subdomain,
      clickCount: l.click_count,
      clickthroughCount: l.clickthrough_count
    }));

    return {
      output: { links: mapped },
      message: `Found **${mapped.length}** FanLink(s)${ctx.input.targetType ? ` of type "${ctx.input.targetType}"` : ''}.`
    };
  })
  .build();
