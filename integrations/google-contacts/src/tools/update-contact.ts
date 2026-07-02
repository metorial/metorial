import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactInputSchema, contactOutputSchema, formatContact } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Updates an existing contact's data. You must provide the contact's resource name and etag (obtained from a previous get/list/search). Only the fields you include will be updated; omitted fields remain unchanged.`,
  instructions: [
    'The etag must be the current etag of the contact to prevent overwriting concurrent changes. Get it from a recent get or list operation.',
    'Only contact data can be modified — profile and domain contact data cannot be changed.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.updateContact)
  .input(
    z.object({
      resourceName: z
        .string()
        .describe('Resource name of the contact to update (e.g., "people/c12345")'),
      etag: z.string().describe('ETag of the contact for concurrency control'),
      contactData: contactInputSchema.describe('Fields to update on the contact')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateFields: string[] = [];
    if (ctx.input.contactData.names) updateFields.push('names');
    if (ctx.input.contactData.emailAddresses) updateFields.push('emailAddresses');
    if (ctx.input.contactData.phoneNumbers) updateFields.push('phoneNumbers');
    if (ctx.input.contactData.addresses) updateFields.push('addresses');
    if (ctx.input.contactData.organizations) updateFields.push('organizations');
    if (ctx.input.contactData.birthdays) updateFields.push('birthdays');
    if (ctx.input.contactData.urls) updateFields.push('urls');
    if (ctx.input.contactData.biographies) updateFields.push('biographies');
    if (ctx.input.contactData.userDefined) updateFields.push('userDefined');
    if (ctx.input.contactData.nicknames) updateFields.push('nicknames');
    if (ctx.input.contactData.relations) updateFields.push('relations');
    if (ctx.input.contactData.events) updateFields.push('events');
    if (ctx.input.contactData.occupations) updateFields.push('occupations');

    let result = await client.updateContact(
      ctx.input.resourceName,
      ctx.input.contactData,
      ctx.input.etag,
      updateFields.join(',')
    );
    let contact = formatContact(result);

    let displayName =
      contact.names?.[0]?.displayName ||
      contact.emailAddresses?.[0]?.value ||
      ctx.input.resourceName;
    return {
      output: contact,
      message: `Updated contact **${displayName}**. Fields modified: ${updateFields.join(', ')}.`
    };
  })
  .build();
