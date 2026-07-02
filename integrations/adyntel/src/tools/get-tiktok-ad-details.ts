import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tiktokAdDetailSchema = z.object({
  ad: z
    .object({
      auditStatus: z.string().optional(),
      estimatedAudience: z.string().optional(),
      firstShownDate: z.number().optional(),
      adId: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
      impression: z.number().optional(),
      lastShownDate: z.number().optional(),
      name: z.string().optional(),
      showMode: z.number().optional(),
      spent: z.string().optional(),
      type: z.number().optional(),
      videos: z
        .array(
          z
            .object({
              coverImg: z.string().optional(),
              videoUrl: z.string().optional()
            })
            .passthrough()
        )
        .optional()
    })
    .passthrough()
    .optional(),
  advertiser: z
    .object({
      name: z.string().optional(),
      registryLocation: z.string().optional(),
      sponsor: z.string().nullable().optional(),
      ttUser: z.string().nullable().optional(),
      advBizIds: z.array(z.string()).optional()
    })
    .passthrough()
    .optional(),
  targeting: z
    .object({
      age: z.any().optional(),
      audience: z.any().optional(),
      gender: z.any().optional(),
      interest: z.any().optional(),
      location: z.any().optional(),
      targetAudienceSize: z.any().optional(),
      creatorInteractions: z.any().optional(),
      videoInteractions: z.any().optional()
    })
    .passthrough()
    .optional()
});

export let getTikTokAdDetails = SlateTool.create(spec, {
  name: 'Get TikTok Ad Details',
  key: 'get_tiktok_ad_details',
  description: `Get full details of a specific TikTok ad. Returns comprehensive ad data including video/image URLs, estimated audience size, impression data, advertiser information, and targeting details (age, gender, location, interests). Requires an ad ID obtained from TikTok ad search results.`,
  instructions: ['The adId must be obtained from the "Search TikTok Ads" tool results.'],
  constraints: ['Each successful API call consumes 1 credit.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      adId: z.number().describe('The TikTok ad ID from search results')
    })
  )
  .output(tiktokAdDetailSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let response = await client.getTikTokAdDetails({
      adId: ctx.input.adId
    });

    let data = response?.data ?? response;

    let ad = data?.ad ?? {};
    let advertiser = data?.advertiser ?? {};
    let targeting = data?.targeting ?? {};

    return {
      output: {
        ad: {
          auditStatus: ad?.audit_status ?? ad?.auditStatus,
          estimatedAudience: ad?.estimated_audience ?? ad?.estimatedAudience,
          firstShownDate: ad?.first_shown_date ?? ad?.firstShownDate,
          adId: ad?.id ? String(ad.id) : undefined,
          imageUrls: ad?.image_urls ?? ad?.imageUrls,
          impression: ad?.impression,
          lastShownDate: ad?.last_shown_date ?? ad?.lastShownDate,
          name: ad?.name,
          showMode: ad?.show_mode ?? ad?.showMode,
          spent: ad?.spent,
          type: ad?.type,
          videos: ad?.videos?.map((v: any) => ({
            coverImg: v?.cover_img ?? v?.coverImg,
            videoUrl: v?.video_url ?? v?.videoUrl
          }))
        },
        advertiser: {
          name: advertiser?.name,
          registryLocation: advertiser?.registry_location ?? advertiser?.registryLocation,
          sponsor: advertiser?.sponsor,
          ttUser: advertiser?.tt_user ?? advertiser?.ttUser,
          advBizIds: advertiser?.adv_biz_ids ?? advertiser?.advBizIds
        },
        targeting: {
          age: targeting?.age,
          audience: targeting?.audience,
          gender: targeting?.gender,
          interest: targeting?.interest,
          location: targeting?.location,
          targetAudienceSize: targeting?.target_audience_size ?? targeting?.targetAudienceSize,
          creatorInteractions:
            targeting?.creator_interactions ?? targeting?.creatorInteractions,
          videoInteractions: targeting?.video_interactions ?? targeting?.videoInteractions
        }
      },
      message: `Retrieved details for TikTok ad **${ad?.name || ctx.input.adId}** by advertiser **${advertiser?.name || 'unknown'}**.`
    };
  })
  .build();
