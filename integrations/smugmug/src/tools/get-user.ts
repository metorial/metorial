import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a SmugMug user's account information and profile details. Provides user nickname, display name, account URL, bio text, and social media links. Use this to look up any SmugMug user by their nickname, or omit the nickname to get the authenticated user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nickname: z
        .string()
        .optional()
        .describe('SmugMug user nickname. If omitted, returns the authenticated user.')
    })
  )
  .output(
    z.object({
      nickname: z.string().describe('User nickname'),
      displayName: z.string().describe('User display name'),
      webUri: z.string().optional().describe("URL of the user's SmugMug site"),
      accountStatus: z.string().optional().describe('Account status'),
      plan: z.string().optional().describe('Account plan type'),
      domain: z.string().optional().describe('Custom domain if configured'),
      imageCount: z.number().optional().describe('Total number of images'),
      profile: z
        .object({
          bioText: z.string().optional().describe('User bio text'),
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().optional().describe('Last name'),
          facebook: z.string().optional().describe('Facebook URL'),
          instagram: z.string().optional().describe('Instagram URL'),
          twitter: z.string().optional().describe('Twitter URL')
        })
        .optional()
        .describe('User profile details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let user: any;
    if (ctx.input.nickname) {
      user = await client.getUser(ctx.input.nickname);
    } else {
      user = await client.getAuthenticatedUser();
    }

    let nickname = user?.NickName || '';
    let profile: any;
    try {
      let profileData = await client.getUserProfile(nickname);
      profile = {
        bioText: profileData?.BioText || undefined,
        firstName: profileData?.FirstName || undefined,
        lastName: profileData?.LastName || undefined,
        facebook: profileData?.Facebook || undefined,
        instagram: profileData?.Instagram || undefined,
        twitter: profileData?.Twitter || undefined
      };
    } catch {
      // Profile may not be accessible
    }

    return {
      output: {
        nickname: nickname,
        displayName: user?.Name || nickname,
        webUri: user?.WebUri || undefined,
        accountStatus: user?.AccountStatus || undefined,
        plan: user?.Plan || undefined,
        domain: user?.Domain || undefined,
        imageCount: user?.ImageCount || undefined,
        profile
      },
      message: `Retrieved user **${user?.Name || nickname}** (${nickname})`
    };
  })
  .build();
