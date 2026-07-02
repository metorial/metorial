import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let manageAd = SlateTool.create(spec, {
  name: 'Manage Ad',
  key: 'manage_ad',
  description: `Create a new ad within an ad group or update an existing one. Configure creative elements such as headline, body text, click URL, call-to-action, and media. Supports text, image, video, and carousel ad formats.`,
  instructions: [
    'To create an ad, omit adId and provide adGroupId. To update, provide the adId.',
    'Available call-to-action options: Shop Now, Sign Up, Download, Install, Learn More, Watch Now, Apply Now, Contact Us, Get Quote, Subscribe, Book Now, Play Now, Get Started.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      adId: z.string().optional().describe('Ad ID to update; omit to create a new ad'),
      adGroupId: z
        .string()
        .optional()
        .describe('Ad group ID for the new ad (required when creating)'),
      name: z.string().optional().describe('Ad name'),
      headline: z.string().optional().describe('Ad headline text'),
      body: z.string().optional().describe('Ad body text'),
      clickUrl: z.string().optional().describe('Destination URL when ad is clicked'),
      callToAction: z
        .enum([
          'SHOP_NOW',
          'SIGN_UP',
          'DOWNLOAD',
          'INSTALL',
          'LEARN_MORE',
          'WATCH_NOW',
          'APPLY_NOW',
          'CONTACT_US',
          'GET_QUOTE',
          'SUBSCRIBE',
          'BOOK_NOW',
          'PLAY_NOW',
          'GET_STARTED'
        ])
        .optional()
        .describe('Call-to-action button text'),
      thumbnailUrl: z.string().optional().describe('Thumbnail/image URL for the ad creative'),
      videoUrl: z.string().optional().describe('Video URL for video ads'),
      status: z.enum(['ACTIVE', 'PAUSED']).optional().describe('Ad status')
    })
  )
  .output(
    z.object({
      adId: z.string().optional(),
      adGroupId: z.string().optional(),
      name: z.string().optional(),
      headline: z.string().optional(),
      status: z.string().optional(),
      callToAction: z.string().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let payload: Record<string, any> = {};
    if (ctx.input.adGroupId !== undefined) payload.ad_group_id = ctx.input.adGroupId;
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.headline !== undefined) payload.headline = ctx.input.headline;
    if (ctx.input.body !== undefined) payload.body = ctx.input.body;
    if (ctx.input.clickUrl !== undefined) payload.click_url = ctx.input.clickUrl;
    if (ctx.input.callToAction !== undefined) payload.call_to_action = ctx.input.callToAction;
    if (ctx.input.thumbnailUrl !== undefined) payload.thumbnail_url = ctx.input.thumbnailUrl;
    if (ctx.input.videoUrl !== undefined) payload.video_url = ctx.input.videoUrl;
    if (ctx.input.status !== undefined) payload.status = ctx.input.status;

    let result: any;
    let action: string;

    if (ctx.input.adId) {
      result = await client.updateAd(ctx.input.adId, payload);
      action = 'updated';
    } else {
      result = await client.createAd(payload);
      action = 'created';
    }

    return {
      output: {
        adId: result.id || result.ad_id,
        adGroupId: result.ad_group_id,
        name: result.name,
        headline: result.headline,
        status: result.status || result.effective_status,
        callToAction: result.call_to_action || result.cta,
        raw: result
      },
      message: `Ad **${result.name || ctx.input.name}** ${action} successfully.`
    };
  })
  .build();
