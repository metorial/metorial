import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in the loyalty system. Supports creating a contact by email, finding or creating by email (idempotent), or creating an anonymous contact. Use **findOrCreate** mode to avoid duplicates.`,
  instructions: [
    'If an email is provided with findOrCreate mode, the contact will be returned if it already exists.',
    'Anonymous contacts can be created without an email and optionally linked to an identifier.'
  ]
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address for the contact'),
      mode: z
        .enum(['create', 'findOrCreate', 'anonymous'])
        .default('create')
        .describe(
          'Creation mode: "create" fails if email exists, "findOrCreate" returns existing contact if found, "anonymous" creates without email'
        ),
      referralCode: z
        .string()
        .optional()
        .describe('Referral code to associate with the new contact'),
      contactIdentifierValue: z
        .string()
        .optional()
        .describe('Contact identifier value for anonymous contacts')
    })
  )
  .output(
    z.object({
      contactUuid: z.string().describe('UUID of the created/found contact'),
      email: z.string().optional().describe('Email address'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.mode === 'anonymous') {
      result = await client.createAnonymousContact(ctx.input.contactIdentifierValue);
    } else if (ctx.input.mode === 'findOrCreate') {
      if (!ctx.input.email) throw new Error('Email is required for findOrCreate mode');
      result = await client.findOrCreateContact(ctx.input.email);
    } else {
      if (!ctx.input.email) throw new Error('Email is required for create mode');
      result = await client.createContact({
        email: ctx.input.email,
        referralCode: ctx.input.referralCode
      });
    }

    let contact = result.data || result;

    return {
      output: {
        contactUuid: contact.uuid,
        email: contact.email,
        createdAt: contact.created_at
      },
      message: `Contact **${contact.email || contact.uuid}** ${ctx.input.mode === 'findOrCreate' ? 'found or created' : 'created'} successfully.`
    };
  })
  .build();
