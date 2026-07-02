import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTinyUrl = SlateTool.create(spec, {
  name: 'Update TinyURL',
  key: 'update_tinyurl',
  description: `Update an existing TinyURL's properties. Can change the alias, domain, destination URL, tags, description, expiration, and analytics settings.
Changing the destination URL requires the **Change URL** token permission (paid feature). Tags, description, and expiration also require a paid plan.`,
  instructions: [
    'To change the destination URL, provide the "newUrl" field. This uses a separate API permission.',
    'To update alias, tags, description, or expiration, provide the respective fields.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .default('tinyurl.com')
        .describe('Current domain of the TinyURL'),
      alias: z.string().describe('Current alias of the TinyURL to update'),
      newAlias: z.string().optional().describe('New alias (1-30 characters)'),
      newDomain: z.string().optional().describe('New domain'),
      newUrl: z
        .string()
        .optional()
        .describe('New destination URL (paid feature, requires Change URL permission)'),
      newTags: z.array(z.string()).optional().describe('Replacement tags (paid feature)'),
      newExpiresAt: z
        .string()
        .nullable()
        .optional()
        .describe(
          'New expiration timestamp in ISO 8601 format, or null to remove (paid feature)'
        ),
      newDescription: z
        .string()
        .nullable()
        .optional()
        .describe('New description (3-1000 chars), or null to remove (paid feature)'),
      analyticsEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable analytics collection')
    })
  )
  .output(
    z.object({
      tinyUrl: z.string().describe('The shortened URL'),
      domain: z.string().describe('Domain of the shortened URL'),
      alias: z.string().describe('Alias portion of the shortened URL'),
      url: z.string().describe('The destination URL'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      expiresAt: z.string().nullable().describe('ISO 8601 expiration timestamp or null'),
      tags: z.array(z.string()).describe('Tags assigned to the link'),
      description: z.string().nullable().describe('Description of the link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    // Change destination URL if requested (uses separate endpoint)
    if (ctx.input.newUrl) {
      result = await client.changeUrl({
        domain: ctx.input.domain,
        alias: ctx.input.alias,
        url: ctx.input.newUrl
      });
      ctx.info('Destination URL updated');
    }

    // Update other properties if any are specified
    let hasMetadataUpdate =
      ctx.input.newAlias !== undefined ||
      ctx.input.newDomain !== undefined ||
      ctx.input.newTags !== undefined ||
      ctx.input.newExpiresAt !== undefined ||
      ctx.input.newDescription !== undefined;

    if (hasMetadataUpdate) {
      result = await client.updateTinyUrl({
        domain: ctx.input.domain,
        alias: ctx.input.alias,
        newAlias: ctx.input.newAlias,
        newDomain: ctx.input.newDomain,
        newTags: ctx.input.newTags,
        newExpiresAt: ctx.input.newExpiresAt,
        newDescription: ctx.input.newDescription
      });
      ctx.info('TinyURL metadata updated');
    }

    // Update analytics status if requested
    if (ctx.input.analyticsEnabled !== undefined) {
      result = await client.setAnalyticsStatus({
        domain: ctx.input.newDomain || ctx.input.domain,
        alias: ctx.input.newAlias || ctx.input.alias,
        enabled: ctx.input.analyticsEnabled
      });
      ctx.info(`Analytics ${ctx.input.analyticsEnabled ? 'enabled' : 'disabled'}`);
    }

    // If no updates were specified, just fetch current state
    if (!result) {
      result = await client.getTinyUrl(ctx.input.domain, ctx.input.alias);
    }

    return {
      output: {
        tinyUrl: result.tiny_url,
        domain: result.domain,
        alias: result.alias,
        url: result.url,
        createdAt: result.created_at,
        expiresAt: result.expires_at,
        tags: result.tags || [],
        description: result.description
      },
      message: `Updated TinyURL **${result.tiny_url}**`
    };
  })
  .build();
