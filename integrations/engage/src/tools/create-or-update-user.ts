import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let metaValue = z.union([z.string(), z.number(), z.boolean()]);

export let createOrUpdateUser = SlateTool.create(spec, {
  name: 'Create or Update User',
  key: 'create_or_update_user',
  description: `Creates a new user (customer or account) in Engage, or updates an existing user's attributes. When creating, provide a **uid** as the unique identifier from your application. When updating, the same uid is used to locate the user. Supports standard fields, custom metadata attributes, device tokens, list subscriptions, and account associations.`,
  instructions: [
    'The uid should be a stable identifier from your application (not an email or mutable field).',
    'If the user already exists with the given uid, their attributes will be updated. Otherwise a new user is created.',
    'Set isAccount to true to create an Account (organizational entity) instead of a Customer.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      uid: z.string().describe('Unique user identifier from your application'),
      firstName: z.string().optional().describe('User first name'),
      lastName: z.string().optional().describe('User last name'),
      email: z.string().optional().describe('User email address'),
      phone: z.string().optional().describe('Phone number in international format'),
      isAccount: z
        .boolean()
        .optional()
        .describe('Set to true to create/convert to an Account type'),
      createdAt: z.string().optional().describe('User creation date (valid date string)'),
      meta: z
        .record(z.string(), metaValue)
        .optional()
        .describe(
          'Custom attributes as key-value pairs (values must be strings, numbers, or booleans)'
        ),
      deviceToken: z.string().optional().describe('Device token for push notifications'),
      devicePlatform: z.enum(['android', 'ios']).optional().describe('Device platform'),
      listIds: z
        .array(z.string())
        .optional()
        .describe('List IDs to subscribe the user to (only on create)'),
      accounts: z
        .array(
          z.object({
            accountId: z.string().describe('Account UID'),
            role: z.string().optional().describe('Role of the user in the account')
          })
        )
        .optional()
        .describe('Accounts to associate the user with')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Internal Engage user ID'),
      uid: z.string().describe('Application-supplied unique identifier'),
      firstName: z.string().nullable().describe('User first name'),
      lastName: z.string().nullable().describe('User last name'),
      email: z.string().nullable().describe('User email'),
      phone: z.string().nullable().describe('User phone number'),
      isAccount: z.boolean().describe('Whether the user is an Account'),
      createdAt: z.string().describe('Creation timestamp'),
      meta: z.record(z.string(), metaValue).describe('Custom attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let input = ctx.input;

    let metaObj = input.meta as Record<string, string | number | boolean> | undefined;

    // Try to get existing user first
    let existingUser: unknown = null;
    try {
      existingUser = await client.getUser(input.uid);
    } catch {
      // User doesn't exist, we'll create
    }

    let user: any;

    if (existingUser) {
      user = await client.updateUser(input.uid, {
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        number: input.phone,
        is_account: input.isAccount,
        created_at: input.createdAt,
        meta: metaObj,
        device_token: input.deviceToken,
        device_platform: input.devicePlatform
      });
    } else {
      user = await client.createUser({
        id: input.uid,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        number: input.phone,
        is_account: input.isAccount,
        created_at: input.createdAt,
        meta: metaObj,
        device_token: input.deviceToken,
        device_platform: input.devicePlatform,
        lists: input.listIds,
        accounts: input.accounts?.map(a => ({ id: a.accountId, role: a.role }))
      });
    }

    return {
      output: {
        userId: user.id,
        uid: user.uid,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.number,
        isAccount: user.is_account,
        createdAt: user.created_at,
        meta: (user.meta || {}) as Record<string, string | number | boolean>
      },
      message: existingUser
        ? `Updated user **${user.uid}** successfully.`
        : `Created new user **${user.uid}** successfully.`
    };
  })
  .build();
