import { SlateTool } from 'slates';
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
      removed: z.boolean().optional().describe('Whether a contact was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
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

    if (action === 'add') {
      let data: Record<string, any> = {};
      if (contactId) {
        data.contactId = contactId;
      } else if (contactData) {
        data.contact = contactData;
      } else {
        throw new Error(
          'Either contactId or contactData is required to add a contact to a sequence'
        );
      }
      if (forcePush) data.forcePush = forcePush;
      if (startStepId) data.startStepId = startStepId;

      let result = await client.addContactToSequence(sequenceId, data);
      return {
        output: { contact: result },
        message: `Added contact to sequence **${sequenceId}**.`
      };
    }

    if (action === 'remove') {
      let data: Record<string, any> = {};
      if (contactId) data.contactId = contactId;
      if (email) data.email = email;

      await client.removeContactFromSequence(sequenceId, data);
      return {
        output: { removed: true },
        message: `Removed contact from sequence **${sequenceId}**.`
      };
    }

    // list
    let result = await client.listSequenceContacts(sequenceId, {
      top,
      skip,
      additionalColumns: 'CurrentStep,LastStepCompletedAt,Status'
    });
    let contacts = Array.isArray(result) ? result : (result?.items ?? []);

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s) in sequence **${sequenceId}**.`
    };
  })
  .build();
