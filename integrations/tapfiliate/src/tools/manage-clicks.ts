import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

let clickSchema = z.object({
  clickId: z.string().describe('Unique identifier of the click'),
  affiliate: z.any().optional().describe('Affiliate associated with the click'),
  program: z.any().optional().describe('Program the click belongs to'),
  referrer: z.string().optional().describe('Referrer URL'),
  landingPage: z.string().optional().describe('Landing page URL'),
  browser: z.string().optional().describe('Browser name'),
  os: z.string().optional().describe('Operating system'),
  ip: z.string().optional().describe('IP address'),
  createdAt: z.string().optional().describe('Click timestamp')
});

export let createClick = SlateTool.create(spec, {
  name: 'Create Click',
  key: 'create_click',
  description: `Create a click programmatically for REST-only integrations (without JavaScript tracking). This is used to attribute conversions when the standard JavaScript tracking snippet is not available.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      referralCode: z.string().describe('Affiliate referral code'),
      assetId: z.string().optional().describe('Asset ID for tracking'),
      sourceId: z.string().optional().describe('Source ID for tracking'),
      referrer: z.string().optional().describe('HTTP referrer URL used in reporting'),
      landingPage: z.string().optional().describe('Current page URL used in reporting'),
      metaData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tracking metadata passed by the affiliate'),
      userAgent: z.string().optional().describe('User agent string of the visitor'),
      ip: z.string().optional().describe('IP address of the visitor')
    })
  )
  .output(clickSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.createClick(ctx.input);

    return {
      output: {
        clickId: result.id,
        affiliate: result.affiliate,
        program: result.program,
        referrer: result.referrer ?? result.details?.referrer ?? undefined,
        landingPage: result.landing_page ?? result.details?.landing_page_url ?? undefined,
        browser: result.browser ?? result.details?.browser ?? undefined,
        os: result.os ?? result.details?.os ?? undefined,
        ip: result.ip ?? undefined,
        createdAt: result.created_at ?? undefined
      },
      message: `Created click \`${result.id}\`.`
    };
  })
  .build();

export let listClicks = SlateTool.create(spec, {
  name: 'List Clicks',
  key: 'list_clicks',
  description: `List tracked clicks with optional filters by affiliate, program, asset, source, and date range. Results are paginated (25 per page).`,
  constraints: ['Listing clicks is only available on the Enterprise plan.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      affiliateId: z.string().optional().describe('Filter by affiliate ID'),
      programId: z.string().optional().describe('Filter by program ID'),
      assetId: z.string().optional().describe('Filter by asset ID'),
      sourceId: z.string().optional().describe('Filter by source ID'),
      dateFrom: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      clicks: z.array(clickSchema).describe('List of clicks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listClicks(ctx.input);

    let clicks = results.map((r: any) => ({
      clickId: r.id,
      affiliate: r.affiliate,
      program: r.program,
      referrer: r.referrer ?? r.details?.referrer ?? undefined,
      landingPage: r.landing_page ?? r.details?.landing_page_url ?? undefined,
      browser: r.browser ?? r.details?.browser ?? undefined,
      os: r.os ?? r.details?.os ?? undefined,
      ip: r.ip ?? undefined,
      createdAt: r.created_at ?? undefined
    }));

    return {
      output: { clicks },
      message: `Found **${clicks.length}** click(s).`
    };
  })
  .build();
