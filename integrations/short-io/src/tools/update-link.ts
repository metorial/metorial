import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { domainIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateLink = SlateTool.create(spec, {
  name: 'Update Link',
  key: 'update_link',
  description: `Update an existing short link's properties. Change the destination URL, custom slug, title, tags, expiration, targeting, password, cloaking, redirect type, UTM parameters, and more.`,
  constraints: ['Rate limit: 20 requests per second.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      linkId: z
        .string()
        .describe('The ID of the link to update (e.g., "lnk_abc123_abcdef" or numeric ID).'),
      domainId: domainIdSchema.optional(),
      ttl: z.string().optional().describe('Time-to-live in milliseconds or an ISO timestamp.'),
      archived: z
        .boolean()
        .optional()
        .describe('Hide the link from the dashboard; redirects continue working.'),
      passwordContact: z
        .boolean()
        .optional()
        .describe('Offer visitors the owner contact email to request the password.'),
      splitURL: z.string().optional().describe('Alternate destination for split testing.'),
      splitPercent: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Percentage of traffic sent to splitURL.'),
      originalURL: z.string().optional().describe('New destination URL.'),
      path: z.string().optional().describe('New custom slug/path.'),
      title: z.string().optional().describe('New title for the link.'),
      tags: z.array(z.string()).optional().describe('Updated tags.'),
      cloaking: z.boolean().optional().describe('Enable or disable URL cloaking.'),
      redirectType: z
        .number()
        .optional()
        .describe('HTTP redirect code: 301, 302, 307, or 308.'),
      password: z.string().optional().describe('Set or update the password.'),
      iphoneURL: z.string().optional().describe('Redirect URL for iPhone/iOS users.'),
      androidURL: z.string().optional().describe('Redirect URL for Android users.'),
      expiresAt: z.string().optional().describe('Expiration date/time in ISO 8601 format.'),
      expiredURL: z.string().optional().describe('URL to redirect to after expiration.'),
      clicksLimit: z.number().optional().describe('Disable the link after this many clicks.'),
      skipQS: z.boolean().optional().describe('Skip forwarding query string parameters.'),
      utmSource: z.string().optional().describe('UTM source parameter.'),
      utmMedium: z.string().optional().describe('UTM medium parameter.'),
      utmCampaign: z.string().optional().describe('UTM campaign parameter.'),
      utmTerm: z.string().optional().describe('UTM term parameter.'),
      utmContent: z.string().optional().describe('UTM content parameter.')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('The unique ID of the updated link.'),
      originalURL: z.string().describe('The destination URL.'),
      shortURL: z.string().describe('The shortened URL.'),
      secureShortURL: z.string().describe('The HTTPS shortened URL.'),
      path: z.string().describe('The slug/path of the short link.'),
      title: z.string().nullable().describe('Title of the link.'),
      tags: z.array(z.string()).nullable().describe('Tags on the link.'),
      cloaking: z.boolean().nullable().describe('Whether cloaking is enabled.'),
      archived: z.boolean().describe('Whether the link is archived.'),
      updatedAt: z.string().describe('Last updated timestamp.'),
      domainId: domainIdSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { linkId, domainId, ...updateParams } = ctx.input;
    let link = await client.updateLink(linkId, updateParams, domainId ?? ctx.config.domainId);

    return {
      output: {
        linkId: link.idString,
        originalURL: link.originalURL,
        shortURL: link.shortURL,
        secureShortURL: link.secureShortURL,
        path: link.path,
        title: link.title,
        tags: link.tags,
        cloaking: link.cloaking,
        archived: link.archived,
        updatedAt: link.updatedAt,
        domainId: link.DomainId
      },
      message: `Updated link **${link.secureShortURL}** (${link.idString})`
    };
  })
  .build();
