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
        .describe('Enable or disable analytics collection'),
      analyticsPublic: z
        .boolean()
        .optional()
        .describe('Enable or disable public analytics sharing')
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
      description: z.string().nullable().describe('Description of the link'),
      analyticsEnabled: z.boolean().describe('Whether analytics collection is enabled'),
      analyticsPublic: z.boolean().describe('Whether analytics are publicly shared')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let domain = ctx.input.domain;
    let alias = ctx.input.alias;
    let changed = false;

    if (ctx.input.newUrl !== undefined) {
      await client.changeUrl({ domain, alias, url: ctx.input.newUrl });
      changed = true;
      ctx.info('Destination URL updated');
    }

    let hasMetadataUpdate =
      ctx.input.newAlias !== undefined ||
      ctx.input.newDomain !== undefined ||
      ctx.input.newTags !== undefined ||
      ctx.input.newExpiresAt !== undefined ||
      ctx.input.newDescription !== undefined;

    if (hasMetadataUpdate) {
      let metadata = await client.updateTinyUrl({
        domain,
        alias,
        newAlias: ctx.input.newAlias,
        newDomain: ctx.input.newDomain,
        newTags: ctx.input.newTags,
        newExpiresAt: ctx.input.newExpiresAt,
        newDescription: ctx.input.newDescription
      });
      domain = metadata.domain;
      alias = metadata.alias;
      changed = true;
      ctx.info('TinyURL metadata updated');
    }

    if (ctx.input.analyticsEnabled !== undefined) {
      await client.setAnalyticsStatus({ domain, alias, enabled: ctx.input.analyticsEnabled });
      changed = true;
      ctx.info(`Analytics ${ctx.input.analyticsEnabled ? 'enabled' : 'disabled'}`);
    }

    if (ctx.input.analyticsPublic !== undefined) {
      await client.setAnalyticsSharing({ domain, alias, public: ctx.input.analyticsPublic });
      changed = true;
      ctx.info(`Analytics sharing ${ctx.input.analyticsPublic ? 'enabled' : 'disabled'}`);
    }

    let result = await client.getTinyUrl(
      domain,
      alias,
      changed
        ? 'retrieve updated TinyURL (changes may already have been applied)'
        : 'retrieve TinyURL'
    );

    return {
      output: {
        tinyUrl: result.tiny_url,
        domain: result.domain,
        alias: result.alias,
        url: result.url,
        createdAt: result.created_at,
        expiresAt: result.expires_at,
        tags: result.tags || [],
        description: result.description ?? null,
        analyticsEnabled: result.analytics?.enabled ?? false,
        analyticsPublic: result.analytics?.public ?? false
      },
      message: `${changed ? 'Updated' : 'Retrieved'} TinyURL **${result.tiny_url}**`
    };
  })
  .build();
