import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContactList = SlateTool.create(spec, {
  name: 'Get Contact List',
  key: 'get_contact_list',
  description:
    'Retrieve a contact list by ID, including its description, active contact count, and custom-field labels. Use list_contact_lists to discover list IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: z.string().describe('Contact list ID from list_contact_lists')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Contact list ID'),
      name: z.string().describe('Contact list name'),
      description: z.string().describe('Contact list description'),
      activeContactCount: z.number().describe('Number of active contacts'),
      createdDate: z.string().describe('List creation date'),
      firstNameLabel: z.string().describe('First-name field label'),
      middleNameLabel: z.string().describe('Middle-name field label'),
      lastNameLabel: z.string().describe('Last-name field label'),
      customFields: z
        .array(
          z.object({
            key: z.string().describe('Field key accepted by manage_contact, such as field1'),
            name: z.string().describe('Custom-field label'),
            type: z.string().describe('Provider custom-field type code')
          })
        )
        .describe('Custom-field definitions for this list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getContactList(ctx.input.listId);
    let list = result.Data;
    if (!isApiErrorRecord(list)) {
      throw createApiServiceError('Benchmark Email did not return contact-list details.');
    }
    let customFields = Array.from({ length: 24 }, (_, index) => ({
      key: `field${index + 1}`,
      name: String(list[`Field${index + 1}Name`] ?? ''),
      type: String(list[`Field${index + 1}Type`] ?? '')
    }));
    let output = {
      listId: String(list.ID ?? ctx.input.listId),
      name: String(list.Name ?? ''),
      description: String(list.Description ?? ''),
      activeContactCount: Number(list.ActiveContactCount ?? 0),
      createdDate: String(list.CreatedDateTime ?? list.CreatedDate ?? ''),
      firstNameLabel: String(list.FirstnameLabel ?? ''),
      middleNameLabel: String(list.MiddlenameLabel ?? ''),
      lastNameLabel: String(list.LastnameLabel ?? ''),
      customFields
    };
    return { output, message: `Retrieved contact list "${output.name}" (${output.listId}).` };
  })
  .build();
