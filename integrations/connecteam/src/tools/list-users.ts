import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('Unique user identifier'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  phoneNumber: z.string().optional().describe('Phone number with country code'),
  email: z.string().optional().describe('Email address'),
  userType: z.string().describe('User role: user, admin, or owner'),
  isArchived: z.boolean().describe('Whether the user is archived'),
  createdAt: z.number().optional().describe('Unix timestamp of creation'),
  modifiedAt: z.number().optional().describe('Unix timestamp of last modification'),
  lastLogin: z.number().optional().describe('Unix timestamp of last login'),
  smartGroupsIds: z
    .array(z.number())
    .optional()
    .describe('IDs of smart groups the user belongs to'),
  customFields: z
    .array(
      z.object({
        customFieldId: z.number(),
        name: z.string().optional(),
        type: z.string().optional(),
        value: z.any()
      })
    )
    .optional()
    .describe('Custom field values')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve a list of users/employees from Connecteam. Supports filtering by user IDs, status, names, phone numbers, email addresses, and creation/modification dates. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userIds: z.array(z.number()).optional().describe('Filter by specific user IDs'),
      userStatus: z
        .enum(['active', 'archived', 'all'])
        .optional()
        .describe('Filter by user status. Defaults to active.'),
      fullNames: z
        .array(z.string())
        .optional()
        .describe('Filter by exact full names (case-sensitive)'),
      phoneNumbers: z
        .array(z.string())
        .optional()
        .describe('Filter by phone numbers in E.164 format (e.g. "+12124567890")'),
      emailAddresses: z.array(z.string()).optional().describe('Filter by email addresses'),
      createdAfter: z
        .number()
        .optional()
        .describe('Only return users created after this Unix timestamp'),
      modifiedAfter: z
        .number()
        .optional()
        .describe('Only return users modified after this Unix timestamp'),
      sort: z.enum(['createdAt']).optional().describe('Sort field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().min(1).max(500).optional().describe('Results per page (max 500)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema),
      nextOffset: z
        .number()
        .optional()
        .describe('Offset for the next page, absent if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let response = await client.getUsers({
      userIds: ctx.input.userIds,
      userStatus: ctx.input.userStatus,
      fullNames: ctx.input.fullNames,
      phoneNumbers: ctx.input.phoneNumbers,
      emailAddresses: ctx.input.emailAddresses,
      createdAt: ctx.input.createdAfter,
      modifiedAt: ctx.input.modifiedAfter,
      sort: ctx.input.sort,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = response.data?.users ?? [];

    return {
      output: {
        users,
        nextOffset: response.paging?.offset
      },
      message: `Retrieved **${users.length}** user(s).${response.paging?.offset ? ` More results available at offset ${response.paging.offset}.` : ''}`
    };
  })
  .build();
