import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let modifyGroupMembers = SlateTool.create(spec, {
  name: 'Modify Group Members',
  key: 'modify_group_members',
  description: `Add or remove contacts from a contact group. You can add contacts to \`contactGroups/myContacts\` and \`contactGroups/starred\`, and to any user-defined group. Provide contact resource names to add and/or remove in a single operation.`,
  constraints: [
    'Only contactGroups/myContacts and contactGroups/starred system groups support adding members. Other system groups only support removal.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.modifyGroupMembers)
  .input(
    z.object({
      groupResourceName: z
        .string()
        .describe(
          'Resource name of the group (e.g., "contactGroups/abc123" or "contactGroups/starred")'
        ),
      addContactResourceNames: z
        .array(z.string())
        .optional()
        .describe('Contact resource names to add (e.g., ["people/c12345"])'),
      removeContactResourceNames: z
        .array(z.string())
        .optional()
        .describe('Contact resource names to remove')
    })
  )
  .output(
    z.object({
      notFoundResourceNames: z
        .array(z.string())
        .optional()
        .describe('Resource names that were not found'),
      canNotRemoveLastContactGroupResourceNames: z
        .array(z.string())
        .optional()
        .describe('Contacts that cannot be removed from their last group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.modifyContactGroupMembers(
      ctx.input.groupResourceName,
      ctx.input.addContactResourceNames,
      ctx.input.removeContactResourceNames
    );

    let addedCount = ctx.input.addContactResourceNames?.length || 0;
    let removedCount = ctx.input.removeContactResourceNames?.length || 0;
    let parts: string[] = [];
    if (addedCount > 0) parts.push(`added **${addedCount}**`);
    if (removedCount > 0) parts.push(`removed **${removedCount}**`);

    return {
      output: {
        notFoundResourceNames: result?.notFoundResourceNames,
        canNotRemoveLastContactGroupResourceNames:
          result?.canNotRemoveLastContactGroupResourceNames
      },
      message: `Modified group **${ctx.input.groupResourceName}**: ${parts.join(' and ')} member(s).`
    };
  })
  .build();
