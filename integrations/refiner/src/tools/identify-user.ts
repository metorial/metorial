import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let identifyUser = SlateTool.create(spec, {
  name: 'Identify User',
  key: 'identify_user',
  description: `Create or update a user record in Refiner with custom traits (attributes). Use this to import user data from your backend into Refiner. Traits that don't exist yet will be created automatically. You can also associate users with accounts for grouping.`,
  instructions: [
    'Provide either a userId or email to identify the user.',
    'Traits are key-value pairs attached to the user record. The trait key becomes the attribute slug.',
    'To group users, provide an account object with at least an account ID.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('External user ID for the contact'),
      email: z.string().optional().describe('Email address of the user'),
      traits: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Key-value pairs of user traits/attributes to set (e.g. { "plan": "enterprise", "signupDate": "2024-01-01" })'
        ),
      account: z
        .object({
          accountId: z.string().optional().describe('External account ID for grouping users'),
          accountName: z.string().optional().describe('Display name of the account'),
          traits: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Key-value pairs of account traits/attributes')
        })
        .optional()
        .describe('Account to associate the user with')
    })
  )
  .output(
    z.object({
      contactUuid: z.string().describe('Refiner internal UUID of the created/updated contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    let result = (await client.identifyUser({
      id: ctx.input.userId,
      email: ctx.input.email,
      traits: ctx.input.traits,
      account: ctx.input.account
        ? {
            id: ctx.input.account.accountId,
            name: ctx.input.account.accountName,
            traits: ctx.input.account.traits
          }
        : undefined
    })) as any;

    let identifier = ctx.input.userId || ctx.input.email || 'unknown';

    return {
      output: {
        contactUuid: result.contact_uuid
      },
      message: `Identified user **${identifier}** (UUID: ${result.contact_uuid}).`
    };
  })
  .build();
