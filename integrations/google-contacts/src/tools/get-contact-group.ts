import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactGroupSchema, formatContactGroup } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let getContactGroup = SlateTool.create(spec, {
  name: 'Get Contact Group',
  key: 'get_contact_group',
  description: `Retrieves details about a specific contact group including its name, type, member count, and member resource names. Use this to inspect group membership.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleContactsActionScopes.getContactGroup)
  .input(
    z.object({
      resourceName: z
        .string()
        .describe(
          'Resource name of the contact group (e.g., "contactGroups/abc123" or "contactGroups/myContacts")'
        ),
      maxMembers: z
        .number()
        .optional()
        .describe('Maximum number of member resource names to return (default 100)')
    })
  )
  .output(contactGroupSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getContactGroup(ctx.input.resourceName, ctx.input.maxMembers);
    let group = formatContactGroup(result);

    return {
      output: group,
      message: `Retrieved contact group **${group.formattedName || group.name || ctx.input.resourceName}** with ${group.memberCount || 0} members.`
    };
  })
  .build();
