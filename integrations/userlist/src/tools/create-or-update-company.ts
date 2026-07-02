import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateCompany = SlateTool.create(spec, {
  name: 'Create or Update Company',
  key: 'create_or_update_company',
  description: `Creates a new company in Userlist or updates an existing one. Companies represent accounts or organizations that users belong to. If the company already exists (matched by identifier), only the specified fields will be updated.
Set a property to \`null\` to remove it. Supports custom properties and user relationships.`,
  instructions: [
    'The `identifier` field is required and must uniquely identify the company.',
    'Custom properties support strings, numbers, booleans, arrays, objects, and null values.'
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
        .describe('Unique identifier for the company in your application.'),
      name: z.string().optional().describe('Display name of the company.'),
      signedUpAt: z
        .string()
        .optional()
        .describe('Timestamp when the company signed up, in RFC3339/ISO8601 format.'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Custom key-value properties for the company. Keys are normalized to snake_case.'
        ),
      relationships: z
        .array(
          z.object({
            user: z.string().describe('Identifier of the user to associate with.'),
            properties: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Properties for this relationship, e.g. role.')
          })
        )
        .optional()
        .describe('User relationships to create or update for this company.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was accepted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: Record<string, unknown> = {
      identifier: ctx.input.identifier
    };
    if (ctx.input.name) payload.name = ctx.input.name;
    if (ctx.input.signedUpAt) payload.signed_up_at = ctx.input.signedUpAt;
    if (ctx.input.properties) payload.properties = ctx.input.properties;
    if (ctx.input.relationships) payload.relationships = ctx.input.relationships;

    await client.createOrUpdateCompany(payload as any);

    return {
      output: { success: true },
      message: `Company **${ctx.input.identifier}** has been created or updated successfully.`
    };
  })
  .build();
