import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { adIdentifier, flattenAds, mapSummary } from '../lib/response';
import { spec } from '../spec';

let adSchema = z
  .object({
    adId: z.string().optional(),
    name: z.string().optional(),
    auditStatus: z.string().optional(),
    estimatedAudience: z.string().optional(),
    firstShownDate: z.number().optional(),
    lastShownDate: z.number().optional(),
    imageUrls: z.array(z.string()).optional(),
    impression: z.number().optional(),
    showMode: z.number().optional(),
    spent: z.string().optional(),
    type: z.union([z.string(), z.number()]).optional(),
    videos: z
      .array(
        z
          .object({ coverImg: z.string().optional(), videoUrl: z.string().optional() })
          .passthrough()
      )
      .optional()
  })
  .passthrough();
let advertiserSchema = z
  .object({
    name: z.string().optional(),
    registryLocation: z.string().optional(),
    sponsor: z.string().nullable().optional(),
    ttUser: z.string().nullable().optional(),
    advBizIds: z.array(z.string()).optional()
  })
  .passthrough();

export let getTikTokAd = SlateTool.create(spec, {
  key: 'get_tiktok_ad',
  name: 'Get TikTok Ad',
  description:
    'Retrieve TikTok ad creatives, advertiser information, audience estimates, and targeting using the exact string ID from Search TikTok Ads.',
  instructions: [
    'Pass the adId string from Search TikTok Ads without converting it to a number.'
  ],
  constraints: ['Each successful request consumes one credit.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      adId: z.string().describe('Exact adId from Search TikTok Ads, kept as a string')
    })
  )
  .output(
    z.object({
      ad: adSchema.optional(),
      advertiser: advertiserSchema.optional(),
      targeting: z.record(z.string(), z.unknown()).optional(),
      rawResponse: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth).getTikTokAdDetails({ adId: ctx.input.adId });
    let data = isApiErrorRecord(response?.data) ? response.data : response;
    let rawAd = isApiErrorRecord(data?.ad) ? data.ad : undefined;
    let rawAdvertiser = isApiErrorRecord(data?.advertiser) ? data.advertiser : undefined;
    let videos = flattenAds(rawAd?.videos)?.map(video =>
      mapSummary(adSchema.shape.videos.unwrap().element, video, {
        coverImg: 'cover_img',
        videoUrl: 'video_url'
      })
    );
    let ad =
      rawAd &&
      mapSummary(
        adSchema,
        { ...rawAd, adId: adIdentifier(rawAd.id ?? rawAd.adId), videos },
        {
          auditStatus: 'audit_status',
          estimatedAudience: 'estimated_audience',
          firstShownDate: 'first_shown_date',
          lastShownDate: 'last_shown_date',
          imageUrls: 'image_urls',
          showMode: 'show_mode'
        }
      );
    let rawBizIds = rawAdvertiser?.adv_biz_ids ?? rawAdvertiser?.advBizIds;
    let advertiser =
      rawAdvertiser &&
      mapSummary(
        advertiserSchema,
        {
          ...rawAdvertiser,
          advBizIds: typeof rawBizIds === 'string' ? [rawBizIds] : rawBizIds
        },
        { registryLocation: 'registry_location', ttUser: 'tt_user' }
      );
    return {
      output: {
        ad,
        advertiser,
        targeting: isApiErrorRecord(data?.targeting) ? data.targeting : undefined,
        rawResponse: response
      },
      message: `Retrieved TikTok ad **${ad?.name ?? ctx.input.adId}**.`
    };
  })
  .build();
