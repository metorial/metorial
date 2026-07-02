import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Look up an OpenSea account profile by wallet address or username. Returns the account's bio, profile image, social links, and other public information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      addressOrUsername: z.string().describe('Wallet address (e.g. 0x...) or OpenSea username')
    })
  )
  .output(
    z.object({
      address: z.string().nullable().describe('Wallet address'),
      username: z.string().nullable().describe('OpenSea username'),
      profileImageUrl: z.string().nullable().describe('Profile image URL'),
      bannerImageUrl: z.string().nullable().describe('Banner image URL'),
      bio: z.string().nullable().describe('Account biography'),
      website: z.string().nullable().describe('Website URL'),
      socialMediaAccounts: z
        .array(
          z.object({
            platform: z.string().describe('Social media platform'),
            username: z.string().describe('Username on the platform')
          })
        )
        .describe('Linked social media accounts'),
      joinedDate: z.string().nullable().describe('Date the account was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getAccount(ctx.input.addressOrUsername);

    let socialMediaAccounts: { platform: string; username: string }[] = [];
    if (data.social_media_accounts) {
      socialMediaAccounts = data.social_media_accounts.map((s: any) => ({
        platform: s.platform ?? 'unknown',
        username: s.username ?? ''
      }));
    }

    let result = {
      address: data.address ?? null,
      username: data.username ?? null,
      profileImageUrl: data.profile_image_url ?? data.profile_img_url ?? null,
      bannerImageUrl: data.banner_image_url ?? null,
      bio: data.bio ?? null,
      website: data.website ?? null,
      socialMediaAccounts,
      joinedDate: data.joined_date ?? data.date_joined ?? null
    };

    return {
      output: result,
      message: `Retrieved account **${result.username || result.address || ctx.input.addressOrUsername}**.`
    };
  })
  .build();
