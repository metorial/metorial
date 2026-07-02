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

export let listOtherContacts = SlateTool.create(spec, {
  name: 'List Other Contacts',
  key: 'list_other_contacts',
  description: `Lists contacts automatically saved in "Other contacts" by Google from interactions. These are read-only and only include names, email addresses, and phone numbers. Requires the \`contacts.other.readonly\` scope.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleContactsActionScopes.listOtherContacts)
  .input(
    z.object({
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of contacts to return (default 100)'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      otherContacts: z.array(otherContactSchema).describe('List of other contacts'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page'),
      totalSize: z.number().optional().describe('Total number of other contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listOtherContacts(ctx.input.pageSize, ctx.input.pageToken);

    let contacts = (result.otherContacts || []).map((c: any) => ({
      resourceName: c.resourceName,
      names: c.names,
      emailAddresses: c.emailAddresses,
      phoneNumbers: c.phoneNumbers
    }));

    return {
      output: {
        otherContacts: contacts,
        nextPageToken: result.nextPageToken,
        totalSize: result.totalSize
      },
      message: `Listed **${contacts.length}** other contacts${result.totalSize ? ` out of ${result.totalSize} total` : ''}.`
    };
  })
  .build();
