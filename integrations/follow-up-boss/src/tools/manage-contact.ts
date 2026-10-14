import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or retrieve a contact (person) in Follow Up Boss. Creation checks for an existing email/phone and returns that contact unchanged when found. Supports assigning agents, lenders, tags, stages, custom fields, and contact details.`,
  instructions: [
    'To create a contact, provide at least a firstName or an email/phone.',
    'To update, provide the personId along with the fields to change.',
    'To retrieve, provide a personId with no update fields.',
    'Tags are an array and replace the current tag list when updating.',
    'Use send_event for new leads that should trigger lead routing and automations.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z
        .number()
        .optional()
        .describe(
          'ID of an existing contact to update or retrieve. Omit to create a new contact.'
        ),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      stage: z
        .string()
        .optional()
        .describe('Lifecycle stage name (e.g., "Lead", "Prospect", "Active Client")'),
      source: z
        .string()
        .optional()
        .describe('Lead source; can only be set when creating a contact'),
      sourceUrl: z
        .string()
        .optional()
        .describe('URL where the lead originated; creation only'),
      emails: z
        .array(
          z.object({
            value: z.string(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Email addresses'),
      phones: z
        .array(
          z.object({
            value: z.string(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Phone numbers'),
      addresses: z
        .array(
          z.object({
            type: z.string().optional(),
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            code: z.string().optional(),
            country: z.string().optional()
          })
        )
        .optional()
        .describe('Addresses'),
      tags: z.array(z.string()).optional().describe('Tags to apply'),
      assignedTo: z.number().optional().describe('User ID to assign the contact to'),
      assignedLenderTo: z.number().optional().describe('Lender user ID'),
      collaborators: z.array(z.number()).optional().describe('User IDs of collaborators'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs'),
      background: z.string().optional().describe('Background/notes about the contact')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('Contact ID'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      stage: z.string().optional(),
      source: z.string().optional(),
      emails: z.array(z.any()).optional(),
      phones: z.array(z.any()).optional(),
      tags: z.array(z.string()).optional(),
      assignedTo: z.number().optional(),
      created: z.string().optional(),
      updated: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (
      ctx.input.personId !== undefined &&
      Object.entries(ctx.input).every(
        ([key, value]) => key === 'personId' || value === undefined
      )
    ) {
      let person = await client.getPerson(ctx.input.personId);
      return {
        output: {
          personId: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          stage: person.stage,
          source: person.source,
          emails: person.emails,
          phones: person.phones,
          tags: person.tags,
          assignedTo: person.assignedUserId,
          created: person.created,
          updated: person.updated
        },
        message: `Retrieved contact **${[person.firstName, person.lastName].filter(Boolean).join(' ')}** (ID: ${person.id}).`
      };
    }

    let { personId, ...fields } = ctx.input;
    let data: Record<string, any> = {};

    if (fields.firstName !== undefined) data.firstName = fields.firstName;
    if (fields.lastName !== undefined) data.lastName = fields.lastName;
    if (fields.stage !== undefined) data.stage = fields.stage;
    if (fields.source !== undefined) data.source = fields.source;
    if (fields.sourceUrl !== undefined) data.sourceUrl = fields.sourceUrl;
    if (fields.emails !== undefined) data.emails = fields.emails;
    if (fields.phones !== undefined) data.phones = fields.phones;
    if (fields.addresses !== undefined) data.addresses = fields.addresses;
    if (fields.tags !== undefined) data.tags = fields.tags;
    if (fields.assignedTo !== undefined) data.assignedUserId = fields.assignedTo;
    if (fields.assignedLenderTo !== undefined) data.assignedLenderId = fields.assignedLenderTo;
    if (fields.collaborators !== undefined) data.collaborators = fields.collaborators;
    if (fields.background !== undefined) data.background = fields.background;
    if (fields.customFields) {
      for (let [key, value] of Object.entries(fields.customFields)) {
        data[key] = value;
      }
    }

    let person: any;
    let action: string;

    if (personId) {
      person = await client.updatePerson(personId, data);
      action = 'Updated';
    } else {
      person = await client.createPerson(data);
      action = 'Created';
    }

    return {
      output: {
        personId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        stage: person.stage,
        source: person.source,
        emails: person.emails,
        phones: person.phones,
        tags: person.tags,
        assignedTo: person.assignedUserId,
        created: person.created,
        updated: person.updated
      },
      message: `${action} contact **${[person.firstName, person.lastName].filter(Boolean).join(' ')}** (ID: ${person.id}).`
    };
  })
  .build();
