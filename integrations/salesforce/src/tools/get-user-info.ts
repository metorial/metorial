import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { salesforceServiceError } from '../lib/errors';
import { spec } from '../spec';

let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);

export let getUserInfo = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Retrieve information about the authenticated Salesforce user from the OAuth userinfo endpoint. Use the returned userId as OwnerId when assigning records, tasks, or activities to the current user.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z
        .string()
        .describe('Salesforce user ID for the authenticated user; usable as OwnerId'),
      organizationId: z.string().optional().describe('Salesforce organization ID'),
      username: z.string().optional().describe('Salesforce username or preferred username'),
      email: z.string().optional().describe('Email address for the authenticated user'),
      emailVerified: z.boolean().optional().describe('Whether Salesforce verified the email'),
      name: z.string().optional().describe('Display name for the authenticated user'),
      firstName: z.string().optional().describe('Given name for the authenticated user'),
      lastName: z.string().optional().describe('Family name for the authenticated user'),
      nickname: z.string().optional().describe('Nickname for the authenticated user'),
      pictureUrl: z.string().optional().describe('Profile picture URL'),
      profileUrl: z.string().optional().describe('Salesforce profile URL'),
      locale: z.string().optional().describe('Locale for the authenticated user'),
      zoneInfo: z.string().optional().describe('Timezone for the authenticated user'),
      userInfo: z
        .record(z.string(), z.any())
        .describe('Raw Salesforce /services/oauth2/userinfo response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let userInfo = await client.getUserInfo();
    let userId = stringValue(userInfo.user_id);

    if (!userId) {
      throw salesforceServiceError('Salesforce userinfo response did not include user_id.');
    }

    let username = stringValue(userInfo.preferred_username);
    let name = stringValue(userInfo.name);

    return {
      output: {
        userId,
        organizationId: stringValue(userInfo.organization_id),
        username,
        email: stringValue(userInfo.email),
        emailVerified:
          typeof userInfo.email_verified === 'boolean' ? userInfo.email_verified : undefined,
        name,
        firstName: stringValue(userInfo.given_name),
        lastName: stringValue(userInfo.family_name),
        nickname: stringValue(userInfo.nickname),
        pictureUrl: stringValue(userInfo.picture),
        profileUrl: stringValue(userInfo.profile),
        locale: stringValue(userInfo.locale),
        zoneInfo: stringValue(userInfo.zoneinfo),
        userInfo
      },
      message: `Authenticated as **${name ?? username ?? userId}** with Salesforce user ID \`${userId}\`.`
    };
  })
  .build();
