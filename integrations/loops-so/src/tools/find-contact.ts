import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('Unique ID of the contact'),
  email: z.string().describe('Email address'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  source: z.string().nullable().describe('How the contact was added'),
  subscribed: z.boolean().describe('Whether the contact is subscribed to campaigns'),
  userGroup: z.string().nullable().describe('User group for segmentation'),
  userId: z.string().nullable().describe('External user ID'),
  mailingLists: z.record(z.string(), z.boolean()).describe('Mailing list subscription status'),
  optInStatus: z
    .string()
    .nullable()
    .describe('Double opt-in status: pending, accepted, rejected, or null'),
  customProperties: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Any custom properties on the contact')
});

export let findContact = SlateTool.create(spec, {
  name: 'Find Contact',
  key: 'find_contact',
  description: `Look up a contact in your Loops audience by email address or user ID. Returns the full contact record including all standard and custom properties, mailing list subscriptions, and opt-in status.`,
  instructions: ['Provide either email or userId, not both.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address to search for'),
      userId: z.string().optional().describe('External user ID to search for')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(contactSchema)
        .describe('List of matching contacts (empty if none found)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.findContact({
      email: ctx.input.email,
      userId: ctx.input.userId
    });

    let contacts = results.map(c => {
      let {
        id,
        email,
        firstName,
        lastName,
        source,
        subscribed,
        userGroup,
        userId,
        mailingLists,
        optInStatus,
        ...rest
      } = c;
      return {
        contactId: id,
        email,
        firstName,
        lastName,
        source,
        subscribed,
        userGroup,
        userId,
        mailingLists: mailingLists || {},
        optInStatus,
        customProperties: Object.keys(rest).length > 0 ? rest : undefined
      };
    });

    let identifier = ctx.input.email || ctx.input.userId || 'unknown';
    return {
      output: { contacts },
      message:
        contacts.length > 0
          ? `Found **${contacts.length}** contact(s) matching **${identifier}**.`
          : `No contacts found matching **${identifier}**.`
    };
  })
  .build();
