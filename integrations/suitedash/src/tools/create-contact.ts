import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Creates a new contact in SuiteDash CRM. Contacts can be assigned a role of **lead**, **prospect**, or **client**. Leads do not require an email and have no portal access. Prospects and clients require an email and get portal access. Optionally send a welcome email upon creation.`,
  instructions: [
    'Role hierarchy is one-directional: lead -> prospect -> client (cannot be reversed).',
    'Email is required for prospect and client roles.',
    'Use the Get Metadata tool first to discover available custom fields for your account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the contact'),
      lastName: z.string().describe('Last name of the contact'),
      email: z
        .string()
        .optional()
        .describe('Email address of the contact (required for prospect and client roles)'),
      role: z.enum(['lead', 'prospect', 'client']).describe('Role assigned to the contact'),
      sendWelcomeEmail: z
        .boolean()
        .optional()
        .describe('Whether to send a welcome email to the contact'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Additional custom fields as key-value pairs (use Get Metadata to discover available fields)'
        )
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.unknown()).describe('The created contact record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicId: ctx.auth.publicId,
      secretKey: ctx.auth.secretKey
    });

    let payload: Record<string, unknown> = {
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      role: ctx.input.role
    };

    if (ctx.input.email !== undefined) {
      payload.email = ctx.input.email;
    }
    if (ctx.input.sendWelcomeEmail !== undefined) {
      payload.send_welcome_email = ctx.input.sendWelcomeEmail;
    }
    if (ctx.input.customFields) {
      Object.assign(payload, ctx.input.customFields);
    }

    let result = await client.createContact(payload as any);

    return {
      output: { contact: result },
      message: `Created contact **${ctx.input.firstName} ${ctx.input.lastName}** with role **${ctx.input.role}**.`
    };
  })
  .build();
