import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or delete a contact. Contacts represent end users who interact with AI agents. Supports upsert (create or update by email/phone) for easy idempotent operations.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['upsert', 'update', 'delete'])
        .describe(
          'Operation to perform. Use "upsert" to create a new contact or update existing by email/phone.'
        ),
      contactId: z.string().optional().describe('Contact ID (required for update/delete)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number in E.164 format'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'upsert') {
      let result = await client.upsertContact({
        first_name: ctx.input.firstName,
        last_name: ctx.input.lastName,
        email: ctx.input.email,
        phone: ctx.input.phone,
        custom_fields: ctx.input.customFields
      });
      let data = result.data || result;
      return {
        output: {
          contactId: data.id,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phone: data.phone
        },
        message: `Upserted contact **${data.first_name || ''} ${data.last_name || ''}** (${data.email || data.phone || data.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateContact(ctx.input.contactId!, {
        first_name: ctx.input.firstName,
        last_name: ctx.input.lastName,
        email: ctx.input.email,
        phone: ctx.input.phone,
        custom_fields: ctx.input.customFields
      });
      let data = result.data || result;
      return {
        output: {
          contactId: data.id,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phone: data.phone
        },
        message: `Updated contact **${data.first_name || ''} ${data.last_name || ''}**.`
      };
    }

    // delete
    await client.deleteContact(ctx.input.contactId!);
    return {
      output: {
        contactId: ctx.input.contactId,
        deleted: true
      },
      message: `Deleted contact \`${ctx.input.contactId}\`.`
    };
  })
  .build();
