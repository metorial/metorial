import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Gong user ID'),
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
  raw: z.any().optional().describe('Original Gong user payload')
});

let normalizeUser = (user: any) => ({
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
  raw: user
});

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a specific Gong user by ID, including profile metadata and settings returned by Gong.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('Gong user ID')
    })
  )
  .output(
    z.object({
      user: userSchema.optional().describe('User details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.getUser(ctx.input.userId);
    let user = result.user ? normalizeUser(result.user) : undefined;

    return {
      output: { user },
      message: `Retrieved Gong user **${ctx.input.userId}**.`
    };
  })
  .build();

export let listUsersByFilter = SlateTool.create(spec, {
  name: 'List Users By Filter',
  key: 'list_users_by_filter',
  description: `List Gong users with extensive filters, including user IDs and creation time ranges.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userIds: z.array(z.string()).optional().describe('Specific Gong user IDs to retrieve'),
      createdFromDateTime: z
        .string()
        .optional()
        .describe('Only users created at or after this ISO 8601 time'),
      createdToDateTime: z
        .string()
        .optional()
        .describe('Only users created before this ISO 8601 time'),
      includeAvatars: z.boolean().optional().describe('Include avatar users in results'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('Matching users'),
      totalRecords: z.number().optional().describe('Total matching records'),
      cursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.listUsersExtensive({
      filter: {
        userIds: ctx.input.userIds,
        createdFromDateTime: ctx.input.createdFromDateTime,
        createdToDateTime: ctx.input.createdToDateTime,
        includeAvatars: ctx.input.includeAvatars
      },
      cursor: ctx.input.cursor
    });
    let users = (result.users || []).map(normalizeUser);

    return {
      output: {
        users,
        totalRecords: result.records?.totalRecords,
        cursor: result.records?.cursor
      },
      message: `Retrieved ${users.length} filtered Gong user(s).`
    };
  })
  .build();
