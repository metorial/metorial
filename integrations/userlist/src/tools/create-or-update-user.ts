import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateUser = SlateTool.create(spec, {
  name: 'Create or Update User',
  key: 'create_or_update_user',
  description: `Creates a new user in Userlist or updates an existing one. If the user already exists (matched by identifier or email), only the specified fields will be updated; omitted fields remain unchanged.
Set a property to \`null\` to remove it. Supports custom properties, company relationships, and subscription preferences.`,
  instructions: [
    'Provide at least one of `identifier` or `email` to identify the user.',
    'Custom properties support strings, numbers, booleans, arrays, objects, and null values.',
    'To remove a property, set it to null explicitly.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .optional()
        .describe('Unique identifier for the user in your application.'),
      email: z.string().optional().describe('Email address of the user.'),
      signedUpAt: z
        .string()
        .optional()
        .describe(
          'Timestamp when the user signed up, in RFC3339/ISO8601 format (e.g. 2024-01-15T10:30:00Z).'
        ),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Custom key-value properties for the user. Keys are normalized to snake_case.'
        ),
      relationships: z
        .array(
          z.object({
            company: z.string().describe('Identifier of the company to associate with.'),
            properties: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Properties for this relationship, e.g. role.')
          })
        )
        .optional()
        .describe('Company relationships to create or update for this user.'),
      preferences: z
        .array(
          z.object({
            topic: z.string().describe('Topic identifier for the subscription preference.'),
            subscribed: z
              .boolean()
              .optional()
              .describe('Whether the user is subscribed to this topic.')
          })
        )
        .optional()
        .describe('Subscription preferences for messaging topics.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was accepted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: Record<string, unknown> = {};
    if (ctx.input.identifier) payload.identifier = ctx.input.identifier;
    if (ctx.input.email) payload.email = ctx.input.email;
    if (ctx.input.signedUpAt) payload.signed_up_at = ctx.input.signedUpAt;
    if (ctx.input.properties) payload.properties = ctx.input.properties;
    if (ctx.input.relationships) payload.relationships = ctx.input.relationships;
    if (ctx.input.preferences) payload.preferences = ctx.input.preferences;

    await client.createOrUpdateUser(payload);

    let userRef = ctx.input.identifier || ctx.input.email || 'unknown';
    return {
      output: { success: true },
      message: `User **${userRef}** has been created or updated successfully.`
    };
  })
  .build();
