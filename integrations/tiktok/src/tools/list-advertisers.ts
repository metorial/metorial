import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokBusinessClient } from '../lib/client';
import { tiktokServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listAdvertisers = SlateTool.create(spec, {
  name: 'List Advertisers',
  key: 'list_advertisers',
  description: `List TikTok Ads advertiser accounts that have granted the connected TikTok Business app permission. Use this to discover advertiser IDs before calling campaign, ad group, ad, and reporting tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z
        .string()
        .optional()
        .describe('TikTok Business App ID. Defaults to the ID saved during OAuth setup.'),
      secret: z
        .string()
        .optional()
        .describe(
          'TikTok Business App Secret. Defaults to the secret saved during OAuth setup.'
        )
    })
  )
  .output(
    z.object({
      advertisers: z
        .array(
          z.object({
            advertiserId: z.string().describe('TikTok Ads advertiser/account ID.'),
            advertiserName: z.string().optional().describe('Advertiser account name.'),
            advertiserRole: z
              .string()
              .optional()
              .describe('Role granted for this advertiser.'),
            isValid: z
              .boolean()
              .optional()
              .describe('Whether this advertiser grant is currently valid.'),
            accountRole: z.string().optional().describe('Account role for this advertiser.')
          })
        )
        .describe('Advertiser accounts available to the connected business token.')
    })
  )
  .handleInvocation(async ctx => {
    let appId = ctx.input.appId ?? ctx.auth.businessAppId;
    let secret = ctx.input.secret ?? ctx.auth.businessSecret;

    if (!appId || !secret) {
      throw tiktokServiceError(
        'TikTok Business App ID and Secret are required. Reauthorize with TikTok OAuth (Business), or provide appId and secret.'
      );
    }

    let client = new TikTokBusinessClient({ token: ctx.auth.token });
    let advertisers = await client.listAdvertisers({ appId, secret });

    return {
      output: {
        advertisers
      },
      message: `Retrieved **${advertisers.length}** advertiser account(s).`
    };
  })
  .build();
