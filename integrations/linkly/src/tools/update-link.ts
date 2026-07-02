import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let redirectRuleSchema = z
  .object({
    what: z.enum(['geo', 'device', 'rotator']).describe('Type of redirect rule'),
    matches: z
      .string()
      .describe(
        'Match condition: ISO 3166 alpha-2 country code for geo, platform name for device, or empty for rotator'
      ),
    url: z.string().describe('Destination URL for this rule'),
    percentage: z.number().optional().describe('Traffic percentage for rotator rules (0-100)')
  })
  .describe('Redirect rule configuration');

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
      url: z
        .string()
        .describe('Destination URL (required — pass the current URL if unchanged)'),
      name: z.string().optional().describe('Nickname for the link'),
      note: z.string().optional().describe('Internal notes about the link'),
      domain: z.string().optional().describe('Custom domain for the short link'),
      slug: z.string().optional().describe('Custom slug/suffix for the short URL'),
      enabled: z.boolean().optional().describe('Whether the link is active'),
      blockBots: z.boolean().optional().describe('Block known bots from being tracked'),
      cloaking: z.boolean().optional().describe('Enable link cloaking'),
      hideReferrer: z.boolean().optional().describe('Hide the referrer when redirecting'),
      forwardParams: z
        .boolean()
        .optional()
        .describe('Forward query parameters to the destination URL'),
      publicAnalytics: z.boolean().optional().describe('Make analytics publicly viewable'),
      utmSource: z.string().optional().describe('UTM source parameter'),
      utmMedium: z.string().optional().describe('UTM medium parameter'),
      utmCampaign: z.string().optional().describe('UTM campaign parameter'),
      utmContent: z.string().optional().describe('UTM content parameter'),
      utmTerm: z.string().optional().describe('UTM term parameter'),
      ogTitle: z.string().optional().describe('Open Graph title for social previews'),
      ogDescription: z
        .string()
        .optional()
        .describe('Open Graph description for social previews'),
      ogImage: z.string().optional().describe('Open Graph image URL for social previews'),
      headTags: z.string().optional().describe('Custom HTML tags for the <head> section'),
      bodyTags: z.string().optional().describe('Custom HTML tags for the <body> section'),
      gtmId: z.string().optional().describe('Google Tag Manager container ID'),
      ga4TagId: z.string().optional().describe('Google Analytics 4 measurement ID'),
      fbPixelId: z.string().optional().describe('Meta Pixel ID'),
      expiryDatetime: z
        .string()
        .optional()
        .describe('Link expiry date/time in ISO 8601 format'),
      expiryDestination: z
        .string()
        .optional()
        .describe('Fallback destination URL after expiry'),
      expiryClicks: z
        .number()
        .optional()
        .describe('Number of clicks after which the link expires'),
      password: z.string().optional().describe('Password to protect the link'),
      rules: z
        .array(redirectRuleSchema)
        .optional()
        .describe('Smart redirect rules (geo, device, rotator)'),
      webhooks: z.array(z.string()).optional().describe('Webhook URLs to notify on clicks')
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
