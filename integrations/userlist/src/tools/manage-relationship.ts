import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRelationship = SlateTool.create(spec, {
  name: 'Manage Relationship',
  key: 'manage_relationship',
  description: `Creates, updates, or deletes a many-to-many relationship between a user and a company in Userlist. Relationships can carry custom properties such as the user's role within a company.
Use \`action: "delete"\` to remove the relationship, or omit/set to \`"upsert"\` to create or update it.`,
  instructions: [
    'Both `userIdentifier` and `companyIdentifier` are required.',
    'Use `action: "delete"` to remove a relationship. Default action is "upsert" (create or update).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userIdentifier: z.string().describe('Identifier of the user in the relationship.'),
      companyIdentifier: z.string().describe('Identifier of the company in the relationship.'),
      action: z
        .enum(['upsert', 'delete'])
        .default('upsert')
        .describe('Action to perform: "upsert" to create/update, "delete" to remove.'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom properties for the relationship (e.g. role). Only used for upsert.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was accepted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      await client.deleteRelationship(ctx.input.userIdentifier, ctx.input.companyIdentifier);
      return {
        output: { success: true },
        message: `Relationship between user **${ctx.input.userIdentifier}** and company **${ctx.input.companyIdentifier}** has been deleted.`
      };
    }

    let payload: Record<string, unknown> = {
      user: ctx.input.userIdentifier,
      company: ctx.input.companyIdentifier
    };
    if (ctx.input.properties) payload.properties = ctx.input.properties;

    await client.createOrUpdateRelationship(payload as any);

    return {
      output: { success: true },
      message: `Relationship between user **${ctx.input.userIdentifier}** and company **${ctx.input.companyIdentifier}** has been created or updated.`
    };
  })
  .build();
