import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let upsertUser = SlateTool.create(spec, {
  name: 'Create or Update User',
  key: 'upsert_user',
  description: `Creates a new user or updates an existing user profile in Iterable. Identify the user by **email** and/or **userId**. Attach custom data fields to the profile for personalization in campaigns and journeys.`,
  instructions: [
    'Provide either email or userId (or both) to identify the user.',
    'Use preferUserId: true if creating a user with only a userId and no email.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the user'),
      userId: z.string().optional().describe('Unique user ID'),
      preferUserId: z
        .boolean()
        .optional()
        .describe(
          'If true, allows creating a user with only userId (no email). An auto-generated placeholder email is created.'
        ),
      mergeNestedObjects: z
        .boolean()
        .optional()
        .describe('If true, merges nested objects in dataFields instead of overwriting'),
      createNewFields: z
        .boolean()
        .optional()
        .describe('If true, creates new data fields automatically if they do not exist'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Custom data fields to set on the user profile (e.g. firstName, lastName, signupDate)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      message: z.string().describe('Response message from Iterable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    let result = await client.updateUser({
      email: ctx.input.email,
      userId: ctx.input.userId,
      dataFields: ctx.input.customFields,
      preferUserId: ctx.input.preferUserId,
      mergeNestedObjects: ctx.input.mergeNestedObjects,
      createNewFields: ctx.input.createNewFields
    });

    return {
      output: {
        success: result.code === 'Success',
        message: result.msg || 'User updated successfully'
      },
      message: `User **${ctx.input.email || ctx.input.userId}** has been created/updated.`
    };
  })
  .build();
