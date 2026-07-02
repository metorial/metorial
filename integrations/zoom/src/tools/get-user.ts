import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed profile information for a specific Zoom user including their settings, permissions, and account details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user')
    })
  )
  .output(
    z.object({
      odataUserId: z.string().describe('User ID'),
      email: z.string().describe('User email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      displayName: z.string().optional().describe('Display name'),
      type: z.number().describe('User type: 1=basic, 2=licensed, 3=on-prem'),
      status: z.string().optional().describe('User status'),
      personalMeetingUrl: z.string().optional().describe('Personal meeting URL'),
      timezone: z.string().optional().describe('User timezone'),
      department: z.string().optional().describe('Department'),
      createdAt: z.string().optional().describe('Account creation time'),
      lastLoginTime: z.string().optional().describe('Last login time'),
      language: z.string().optional().describe('User language'),
      phoneNumber: z.string().optional().describe('Phone number'),
      picUrl: z.string().optional().describe('Profile picture URL'),
      roleName: z.string().optional().describe('User role name'),
      accountId: z.string().optional().describe('Account ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let user = await client.getUser(ctx.input.userId);

    return {
      output: {
        odataUserId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        displayName: user.display_name,
        type: user.type,
        status: user.status,
        personalMeetingUrl: user.personal_meeting_url,
        timezone: user.timezone,
        department: user.department,
        createdAt: user.created_at,
        lastLoginTime: user.last_login_time,
        language: user.language,
        phoneNumber: user.phone_number,
        picUrl: user.pic_url,
        roleName: user.role_name,
        accountId: user.account_id
      },
      message: `Retrieved user **${user.display_name || user.email}** (${user.email}). Type: ${user.type === 1 ? 'Basic' : user.type === 2 ? 'Licensed' : 'On-Prem'}, Status: ${user.status || 'N/A'}`
    };
  })
  .build();
