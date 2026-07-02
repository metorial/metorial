import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

let otherContactSchema = z.object({
  resourceName: z.string().describe('Resource name of the other contact'),
  names: z
    .array(
      z.object({
        displayName: z.string().optional(),
        givenName: z.string().optional(),
        familyName: z.string().optional()
      })
    )
    .optional(),
  emailAddresses: z
    .array(
      z.object({
        value: z.string(),
        type: z.string().optional()
      })
    )
    .optional(),
  phoneNumbers: z
    .array(
      z.object({
        value: z.string(),
        type: z.string().optional()
      })
    )
    .optional()
});

export let searchOtherContacts = SlateTool.create(spec, {
  name: 'Search Other Contacts',
  key: 'search_other_contacts',
  description: `Searches "Other contacts" by name, email, or phone number. Other contacts are automatically saved by Google from interactions and are read-only. Requires the \`contacts.other.readonly\` scope.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleContactsActionScopes.searchOtherContacts)
  .input(
    z.object({
      query: z.string().describe('Search query to match against other contacts'),
      pageSize: z.number().optional().describe('Maximum number of results (default 30)')
    })
  )
  .output(
    z.object({
      otherContacts: z.array(otherContactSchema).describe('Matching other contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.searchOtherContacts(ctx.input.query, ctx.input.pageSize);

    let contacts = (result.results || []).map((r: any) => ({
      resourceName: r.person?.resourceName,
      names: r.person?.names,
      emailAddresses: r.person?.emailAddresses,
      phoneNumbers: r.person?.phoneNumbers
    }));

    return {
      output: { otherContacts: contacts },
      message: `Found **${contacts.length}** other contacts matching "${ctx.input.query}".`
    };
  })
  .build();
