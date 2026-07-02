import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create Users',
  key: 'create_users',
  description: `Create one or more users/employees in Connecteam. Supports batch creation of up to 25 users at a time. Can optionally send an activation SMS to new users.`,
  constraints: [
    'Maximum 25 users per request',
    'Phone number must be unique and in E.164 format (e.g. +12124567890)',
    'Email is required for admin-type users'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      users: z
        .array(
          z.object({
            firstName: z.string().describe('First name'),
            lastName: z.string().describe('Last name'),
            phoneNumber: z
              .string()
              .describe('Phone number in E.164 format (e.g. "+12124567890")'),
            email: z.string().optional().describe('Email address (required for admin type)'),
            userType: z
              .enum(['user', 'admin'])
              .optional()
              .describe('User role. Defaults to "user".'),
            isArchived: z.boolean().optional().describe('Whether to create as archived'),
            customFields: z
              .array(
                z.object({
                  customFieldId: z.number().describe('Custom field ID'),
                  value: z.any().describe('Field value. For dropdowns, use [{id: optionId}]')
                })
              )
              .optional()
              .describe('Custom field values to set')
          })
        )
        .min(1)
        .max(25)
        .describe('Users to create'),
      sendActivation: z.boolean().optional().describe('Send SMS activation link to users')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response with created user details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.createUsers(ctx.input.users, ctx.input.sendActivation);

    return {
      output: { result },
      message: `Created **${ctx.input.users.length}** user(s).${ctx.input.sendActivation ? ' Activation SMS sent.' : ''}`
    };
  })
  .build();
