import { z } from 'zod';
import type { Contact } from './types';

export let contactOutputSchema = z.object({
  contactId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  extension: z.string().optional(),
  email: z.string().optional(),
  extraData: z.string().optional(),
  groups: z.string().optional(),
  groupIds: z.array(z.string()).optional().describe('IDs of the contact groups.'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let formatContact = (contact: Contact) => ({
  contactId: contact.id,
  firstName: contact.firstname,
  lastName: contact.lastname,
  phone: contact.phone,
  extension: contact.extension,
  email: contact.email,
  extraData: contact.extra1,
  groups: Array.isArray(contact.groups) ? JSON.stringify(contact.groups) : contact.groups,
  groupIds: Array.isArray(contact.groups) ? contact.groups.map(group => group.id) : undefined,
  createdAt: contact.created_at,
  updatedAt: contact.updated_at
});
