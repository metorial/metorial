import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique user identifier'),
  emailAddress: z.string().optional().describe('User email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  title: z.string().optional().describe('Job title'),
  phoneNumber: z.string().optional().describe('Phone number'),
  extension: z.string().optional().describe('Phone extension'),
  active: z.boolean().optional().describe('Whether the user is active'),
  created: z.string().optional().describe('When the user was created'),
  managerId: z.string().optional().describe('Manager user ID'),
  meetingConsentPageUrl: z.string().optional().describe('Meeting consent page URL'),
  settings: z.any().optional().describe('User settings'),
  avatarUrl: z.string().optional().describe('Avatar URL (if includeAvatars is true)')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all Gong users in the organization. Returns user profile information including name, email, title, and activity status. Supports pagination and optionally includes avatar URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeAvatars: z.boolean().optional().describe('Include avatar URLs in the response'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users'),
      totalRecords: z.number().optional().describe('Total number of users'),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.listUsers({
      includeAvatars: ctx.input.includeAvatars,
      cursor: ctx.input.cursor
    });

    let users = (result.users || []).map((user: any) => ({
      userId: user.id || user.userId,
      emailAddress: user.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      title: user.title,
      phoneNumber: user.phoneNumber,
      extension: user.extension,
      active: user.active,
      created: user.created,
      managerId: user.managerId,
      meetingConsentPageUrl: user.meetingConsentPageUrl,
      settings: user.settings,
      avatarUrl: user.avatarUrl
    }));

    return {
      output: {
        users,
        totalRecords: result.records?.totalRecords,
        cursor: result.records?.cursor
      },
      message: `Retrieved ${users.length} user(s).`
    };
  })
  .build();
