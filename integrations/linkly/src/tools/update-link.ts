import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { linkFields } from '../lib/schemas';
import { spec } from '../spec';

export let updateLink = SlateTool.create(spec, {
  name: 'Update Link',
  key: 'update_link',
  description: `Updates an existing shortened link's configuration. Only the specified fields will be changed; all others remain unchanged. Can update the destination URL, slug, UTM parameters, redirect rules, expiry settings, and more.`,
  instructions: [
    'Provide the linkId of the link to update plus any fields you want to change.',
    'The url field (destination URL) is required even for updates — pass the current URL if unchanged.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      linkId: z.number().describe('ID of the link to update'),
      ...linkFields
    })
  )
  .output(
    z.object({
      linkId: z.number().describe('Unique ID of the updated link'),
      url: z.string().describe('Destination URL'),
      fullUrl: z.string().describe('Full short URL'),
      name: z.string().optional().nullable().describe('Link nickname'),
      domain: z.string().optional().nullable().describe('Custom domain used'),
      slug: z.string().optional().nullable().describe('URL slug'),
      enabled: z.boolean().optional().describe('Whether the link is active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.createOrUpdateLink(ctx.input);

    return {
      output: {
        linkId: result.id,
        url: result.url,
        fullUrl: result.full_url,
        name: result.name,
        domain: result.domain,
        slug: result.slug,
        enabled: result.enabled
      },
      message: `Updated link **${result.full_url}** (ID: ${result.id})`
    };
  })
  .build();
