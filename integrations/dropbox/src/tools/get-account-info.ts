import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve the current user's Dropbox account information including name, email, storage quota, and account type. Optionally look up another user by account ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe(
          "Account ID to look up. If omitted, returns the authenticated user's account."
        )
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('Unique account identifier'),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      emailVerified: z.boolean().optional().describe('Whether the email is verified'),
      profilePhotoUrl: z.string().optional().describe('URL of the profile photo'),
      accountType: z.string().optional().describe('Account type (basic, pro, business)'),
      country: z.string().optional().describe('Country code'),
      locale: z.string().optional().describe('User locale'),
      isPaired: z
        .boolean()
        .optional()
        .describe('Whether the account is paired with a team account'),
      usedBytes: z.number().optional().describe('Storage used in bytes'),
      allocatedBytes: z.number().optional().describe('Storage allocated in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);

    if (ctx.input.accountId) {
      let account = await client.getAccount(ctx.input.accountId);
      return {
        output: {
          accountId: account.account_id,
          displayName: account.name?.display_name,
          email: account.email,
          emailVerified: account.email_verified,
          profilePhotoUrl: account.profile_photo_url,
          accountType: account.account_type?.['.tag'],
          isPaired: account.is_paired
        },
        message: `Retrieved account info for **${account.name?.display_name || account.account_id}**.`
      };
    }

    let [account, spaceUsage] = await Promise.all([
      client.getCurrentAccount(),
      client.getSpaceUsage()
    ]);

    let allocated =
      spaceUsage.allocation?.allocated ??
      spaceUsage.allocation?.user_within_team_space_allocated ??
      spaceUsage.allocation?.team?.allocated;

    return {
      output: {
        accountId: account.account_id,
        displayName: account.name?.display_name,
        email: account.email,
        emailVerified: account.email_verified,
        profilePhotoUrl: account.profile_photo_url,
        accountType: account.account_type?.['.tag'],
        country: account.country,
        locale: account.locale,
        isPaired: account.is_paired,
        usedBytes: spaceUsage.used,
        allocatedBytes: allocated
      },
      message: `Retrieved account info for **${account.name?.display_name}** (${account.email}).`
    };
  })
  .build();
