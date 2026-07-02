import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateUserTool = SlateTool.create(spec, {
  name: 'Create or Update User',
  key: 'create_or_update_user',
  description: `Create a new user or update an existing one. If a user with the given userId or email already exists, they will be updated. Users can be associated with companies and have custom fields.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the user'),
      userId: z
        .string()
        .optional()
        .describe("Your application's unique user ID (used for matching)"),
      email: z.string().optional().describe('Email address of the user'),
      avatarURL: z.string().optional().describe("URL of the user's avatar image"),
      companies: z
        .array(
          z.object({
            companyId: z.string().describe('Company ID'),
            name: z.string().optional().describe('Company name'),
            monthlySpend: z.number().optional().describe('Monthly spend / MRR'),
            customFields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Company custom fields'),
            created: z.string().optional().describe('Company creation date (ISO 8601)')
          })
        )
        .optional()
        .describe('Companies to associate the user with'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs'),
      created: z.string().optional().describe('Override creation timestamp (ISO 8601)')
    })
  )
  .output(
    z.object({
      cannyUserId: z.string().describe('The Canny-internal user ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.createOrUpdateUser({
      name: ctx.input.name,
      userID: ctx.input.userId,
      email: ctx.input.email,
      avatarURL: ctx.input.avatarURL,
      companies: ctx.input.companies?.map(c => ({
        id: c.companyId,
        name: c.name,
        monthlySpend: c.monthlySpend,
        customFields: c.customFields,
        created: c.created
      })),
      customFields: ctx.input.customFields,
      created: ctx.input.created
    });

    return {
      output: { cannyUserId: result.id },
      message: `Created/updated user **${ctx.input.name}** (ID: ${result.id}).`
    };
  })
  .build();
