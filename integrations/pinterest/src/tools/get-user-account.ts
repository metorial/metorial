import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserAccount = SlateTool.create(spec, {
  name: 'Get User Account',
  key: 'get_user_account',
  description: `Retrieve the authenticated user's Pinterest account information, including username, profile image, account type, and follower/following counts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string().optional().describe('Pinterest username'),
      profileImage: z.string().optional().describe('URL of the profile image'),
      websiteUrl: z.string().optional().describe('User website URL'),
      accountType: z.string().optional().describe('Account type (e.g., BUSINESS, PINNER)'),
      boardCount: z.number().optional().describe('Number of boards'),
      pinCount: z.number().optional().describe('Number of pins'),
      followerCount: z.number().optional().describe('Number of followers'),
      followingCount: z.number().optional().describe('Number of accounts followed'),
      monthlyViews: z.number().optional().describe('Monthly views')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUserAccount();

    return {
      output: {
        username: result.username,
        profileImage: result.profile_image,
        websiteUrl: result.website_url,
        accountType: result.account_type,
        boardCount: result.board_count,
        pinCount: result.pin_count,
        followerCount: result.follower_count,
        followingCount: result.following_count,
        monthlyViews: result.monthly_views
      },
      message: `Retrieved account info for **${result.username}**.`
    };
  })
  .build();
