import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLink = SlateTool.create(spec, {
  name: 'Get Link',
  key: 'get_link',
  description: `Retrieves full details of a specific shortened link including its configuration, click statistics, redirect rules, UTM parameters, and Open Graph metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      linkId: z.number().describe('ID of the link to retrieve')
    })
  )
  .output(
    z.object({
      linkId: z.number().describe('Unique ID of the link'),
      url: z.string().describe('Destination URL'),
      fullUrl: z.string().optional().nullable().describe('Full short URL'),
      name: z.string().optional().nullable().describe('Link nickname'),
      note: z.string().optional().nullable().describe('Internal notes'),
      domain: z.string().optional().nullable().describe('Custom domain'),
      slug: z.string().optional().nullable().describe('URL slug'),
      enabled: z.boolean().optional().describe('Whether the link is active'),
      clicksToday: z.number().optional().describe('Number of clicks today'),
      clicksThirtyDays: z.number().optional().describe('Number of clicks in last 30 days'),
      clicksTotal: z.number().optional().describe('Total number of clicks'),
      blockBots: z.boolean().optional().describe('Whether bots are blocked'),
      forwardParams: z.boolean().optional().describe('Whether parameters are forwarded'),
      hideReferrer: z.boolean().optional().describe('Whether referrer is hidden'),
      utmSource: z.string().optional().nullable().describe('UTM source'),
      utmMedium: z.string().optional().nullable().describe('UTM medium'),
      utmCampaign: z.string().optional().nullable().describe('UTM campaign'),
      utmContent: z.string().optional().nullable().describe('UTM content'),
      utmTerm: z.string().optional().nullable().describe('UTM term'),
      ogTitle: z.string().optional().nullable().describe('Open Graph title'),
      ogDescription: z.string().optional().nullable().describe('Open Graph description'),
      ogImage: z.string().optional().nullable().describe('Open Graph image URL'),
      fbPixelId: z.string().optional().nullable().describe('Meta Pixel ID'),
      ga4TagId: z.string().optional().nullable().describe('Google Analytics 4 ID'),
      gtmId: z.string().optional().nullable().describe('Google Tag Manager ID'),
      expiryDatetime: z.string().optional().nullable().describe('Expiry date/time'),
      expiryDestination: z
        .string()
        .optional()
        .nullable()
        .describe('Fallback URL after expiry'),
      expiryClicks: z.number().optional().nullable().describe('Click-based expiry count'),
      rules: z.array(z.any()).optional().nullable().describe('Redirect rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.getLink(ctx.input.linkId);
    let link = result.link || result;

    return {
      output: {
        linkId: link.id,
        url: link.url,
        fullUrl: link.full_url,
        name: link.name,
        note: link.note,
        domain: link.domain,
        slug: link.slug,
        enabled: link.enabled,
        clicksToday: link.clicks_today,
        clicksThirtyDays: link.clicks_thirty_days,
        clicksTotal: link.clicks_total,
        blockBots: link.block_bots,
        forwardParams: link.forward_params,
        hideReferrer: link.hide_referrer,
        utmSource: link.utm_source,
        utmMedium: link.utm_medium,
        utmCampaign: link.utm_campaign,
        utmContent: link.utm_content,
        utmTerm: link.utm_term,
        ogTitle: link.og_title,
        ogDescription: link.og_description,
        ogImage: link.og_image,
        fbPixelId: link.fb_pixel_id,
        ga4TagId: link.ga4_tag_id,
        gtmId: link.gtm_id,
        expiryDatetime: link.expiry_datetime,
        expiryDestination: link.expiry_destination,
        expiryClicks: link.expiry_clicks,
        rules: link.rules
      },
      message: `Retrieved link **${link.full_url || link.id}** → ${link.url} (${link.clicks_total ?? 0} total clicks)`
    };
  })
  .build();
