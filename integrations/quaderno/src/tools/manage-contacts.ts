import { z } from 'zod';
import { contactInput, contactOutput, mapContact, mapContactInput } from '../lib/schemas';
import { tool } from '../lib/tool';
import { idInput, nonempty, pageInput, pageOutput } from '../lib/validation';
export const listContacts = tool({
  name: 'List Contacts',
  key: 'list_contacts',
  description:
    'List contacts in one cursor page, optionally searching their name, email or tax ID.',
  readOnly: true,
  input: { ...pageInput, query: z.string().optional(), processorId: z.string().optional() },
  output: { contacts: z.array(z.object(contactOutput)), ...pageOutput },
  run: async (input, client) => ({
    contacts: (
      await client.list('contacts', input, { q: input.query, processor_id: input.processorId })
    ).map(mapContact),
    ...client.pagination
  })
});
export const getContact = tool({
  name: 'Get Contact',
  key: 'get_contact',
  description: 'Retrieve a contact in the selected account.',
  readOnly: true,
  input: { contactId: idInput },
  output: contactOutput,
  run: async (input, client) => mapContact(await client.get('contacts', input.contactId))
});
export const createContact = tool({
  name: 'Create Contact',
  key: 'create_contact',
  description:
    'Create a contact representing a customer or vendor. Provide firstName, including the display name for a company.',
  input: contactInput,
  output: contactOutput,
  run: async (input, client) =>
    mapContact(await client.create('contacts', mapContactInput(input, true)))
});
export const updateContact = tool({
  name: 'Update Contact',
  key: 'update_contact',
  description:
    'Update only the supplied contact fields. Empty strings clear text fields where the provider allows it.',
  input: { contactId: idInput, ...contactInput },
  output: contactOutput,
  run: async (input, client) => {
    const data = mapContactInput(input);
    nonempty(data);
    return mapContact(await client.update('contacts', input.contactId, data));
  }
});
export const deleteContact = tool({
  name: 'Delete Contact',
  key: 'delete_contact',
  description: 'Delete a contact. Quaderno may reject contacts associated with documents.',
  destructive: true,
  input: { contactId: idInput },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.get('contacts', input.contactId);
    await client.remove('contacts', input.contactId);
    return { success: true };
  }
});
