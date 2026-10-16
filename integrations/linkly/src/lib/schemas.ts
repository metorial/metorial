import { z } from 'zod';

export let redirectRuleSchema = z
  .object({
    what: z.enum(['geo', 'device', 'rotator']).describe('Type of redirect rule'),
    matches: z
      .string()
      .describe(
        'Match condition: ISO 3166 alpha-2 country code for geo, platform name (ios/android/windows/linux/mac) for device, or empty string for rotator'
      ),
    url: z.string().describe('Destination URL for this rule'),
    percentage: z.number().optional().describe('Traffic percentage for rotator rules (0-100)')
  })
  .describe('Redirect rule configuration');

export let linkFields = {
  url: z.string().describe('Destination URL to shorten'),
  name: z.string().optional().describe('Nickname for the link'),
  note: z.string().optional().describe('Internal notes about the link'),
  domain: z.string().optional().describe('Custom domain for the short link'),
  slug: z
    .string()
    .optional()
    .describe('Custom slug/suffix for the short URL (auto-generated if omitted)'),
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
  ogDescription: z.string().optional().describe('Open Graph description for social previews'),
  ogImage: z.string().optional().describe('Open Graph image URL for social previews'),
  headTags: z
    .string()
    .optional()
    .describe('Custom HTML tags for the <head> section (retargeting pixels)'),
  bodyTags: z
    .string()
    .optional()
    .describe('Custom HTML tags for the <body> section (retargeting pixels)'),
  gtmId: z.string().optional().describe('Google Tag Manager container ID'),
  ga4TagId: z.string().optional().describe('Google Analytics 4 measurement ID'),
  fbPixelId: z.string().optional().describe('Meta Pixel ID'),
  expiryDatetime: z.string().optional().describe('Link expiry date/time in ISO 8601 format'),
  expiryDestination: z.string().optional().describe('Fallback destination URL after expiry'),
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
};
