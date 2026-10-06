import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSequenceContacts = SlateTool.create(spec, {
  name: 'Manage Sequence Contacts',
  key: 'manage_sequence_contacts',
  description: `Add or remove contacts from a sequence. Can add a contact by ID or create a new contact inline. Also supports listing contacts in a sequence with their step and status info.`,
  instructions: [
    'To add by existing contact ID, provide "contactId".',
    'To add a new contact inline, provide contact details under "contactData".',
    'To remove, set action to "remove" and provide "contactId" or "email".',
    'To list contacts in the sequence, set action to "list".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'list']).describe('Action to perform'),
      sequenceId: z.number().describe('Sequence ID'),
      contactId: z.number().optional().describe('Contact ID to add or remove'),
      email: z.string().optional().describe('Contact email to remove'),
      forcePush: z
        .boolean()
        .optional()
        .describe('Move contact from current sequence to this one'),
      startStepId: z.number().optional().describe('Step ID to start the contact from'),
      contactData: z
        .object({
          firstName: z.string().describe('First name'),
          email: z.string().optional().describe('Email address'),
          lastName: z.string().optional().describe('Last name'),
          phone: z.string().optional().describe('Phone number'),
          title: z.string().optional().describe('Job title'),
          company: z.string().optional().describe('Company name'),
          linkedInProfile: z.string().optional().describe('LinkedIn profile URL'),
          city: z.string().optional().describe('City'),
          state: z.string().optional().describe('State'),
          country: z.string().optional().describe('Country'),
          customFields: z
            .array(
              z.object({
                key: z.string(),
                value: z.string()
              })
            )
            .optional()
            .describe('Custom fields')
        })
        .optional()
        .describe('Contact data for inline creation when adding to sequence'),
      top: z.number().optional().describe('Max contacts to return when listing'),
      skip: z.number().optional().describe('Number of contacts to skip when listing')
    })
  )
  .output(
    z.object({
      contact: z
        .record(z.string(), z.any())
        .optional()
        .describe('Added or affected contact details'),
      contacts: z.array(z.record(z.string(), z.any())).optional().describe('Listed contacts'),
      hasMore: z.boolean().optional(),
      removed: z.boolean().optional().describe('Whether a contact was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let {
      action,
      sequenceId,
      contactId,
      email,
      forcePush,
      startStepId,
      contactData,
      top,
      skip
    } = ctx.input;

    if (contactId !== undefined && contactData !== undefined)
      throw createApiServiceError('Choose contactId or contactData, not both.');
    if (action === 'add') {
      if (contactId === undefined && !contactData)
        throw createApiServiceError('Supply contactId or contactData.');
      // Validate the target and step before a separately committed inline contact creation.
      await client.getSequence(sequenceId);
      if (startStepId !== undefined) {
        const steps = await client.listSequenceSteps(sequenceId);
        if (!steps.some(step => step.id === startStepId))
          throw createApiServiceError('startStepId does not belong to this sequence.');
      }
      const created = contactData ? await client.createContact(contactData) : undefined;
      const id = contactId ?? created!.id;
      try {
        const result = await client.addContactToSequence(sequenceId, {
          contactId: id,
          forcePush,
          startStepId
        });
        return {
          output: { contact: { ...created, ...result } },
          message: `Enrolled contact ${id} in sequence ${sequenceId}; processing follows the sequence settings.`
        };
      } catch (error) {
        if (created)
          throw createApiServiceError(
            `Contact ${created.id} was created, but enrollment in sequence ${sequenceId} was not confirmed. Inspect membership before retrying; the contact is retained.`,
            { parent: {} }
          );
        throw error;
      }
    }
    if (action === 'remove') {
      let id = contactId;
      if (id === undefined) {
        if (!email) throw createApiServiceError('Supply contactId or email.');
        const matches = await client.searchContacts(email);
        if (matches.length !== 1)
          throw createApiServiceError(
            'Email removal requires exactly one matching contact; use contactId instead.'
          );
        id = matches[0]!.id;
      } else if (email !== undefined) {
        const contact = await client.getContact(id);
        if (contact.email?.toLowerCase() !== email.toLowerCase())
          throw createApiServiceError('contactId and email identify different contacts.');
      }
      await client.removeContactFromSequence(sequenceId, id);
      return {
        output: { removed: true },
        message: `Removed contact ${id} from sequence ${sequenceId}.`
      };
    }

    // list
    let result = await client.listSequenceContacts(sequenceId, {
      top,
      skip,
      additionalColumns: 'CurrentStep,LastStepCompletedAt,Status'
    });
    let contacts = result.items;

    return {
      output: { contacts, hasMore: result.hasMore },
      message: `Found **${contacts.length}** contact(s) in sequence **${sequenceId}**.`
    };
  })
  .build();
