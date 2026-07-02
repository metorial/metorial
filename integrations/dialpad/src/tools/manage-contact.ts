import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let manageContactTool = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, upsert, or delete a Dialpad contact. The **upsert** action uses an external unique identifier to create-or-update, which is useful for syncing contacts from external systems.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'upsert', 'delete'])
        .describe('Action to perform. "upsert" creates or updates based on the externalUid.'),
      contactId: z.string().optional().describe('Contact ID (required for update and delete)'),
      externalUid: z
        .string()
        .optional()
        .describe('External unique identifier for upsert operations'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phones: z.array(z.string()).optional().describe('Phone numbers'),
      emails: z.array(z.string()).optional().describe('Email addresses'),
      companyName: z.string().optional().describe('Company name'),
      jobTitle: z.string().optional().describe('Job title'),
      urls: z.array(z.string()).optional().describe('URLs associated with the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      displayName: z.string().optional(),
      deleted: z.boolean().optional().describe('True if the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let {
      action,
      contactId,
      externalUid,
      firstName,
      lastName,
      phones,
      emails,
      companyName,
      jobTitle,
      urls
    } = ctx.input;

    if (action === 'create') {
      let contact = await client.createContact({
        first_name: firstName,
        last_name: lastName,
        phones,
        emails,
        company_name: companyName,
        job_title: jobTitle,
        urls,
        uid: externalUid
      });

      return {
        output: {
          contactId: String(contact.id),
          firstName: contact.first_name,
          lastName: contact.last_name,
          displayName: contact.display_name
        },
        message: `Created contact **${contact.display_name || contact.first_name || contact.id}**`
      };
    }

    if (action === 'update') {
      if (!contactId) throw new Error('Contact ID is required for update');

      let updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (phones !== undefined) updateData.phones = phones;
      if (emails !== undefined) updateData.emails = emails;
      if (companyName !== undefined) updateData.company_name = companyName;
      if (jobTitle !== undefined) updateData.job_title = jobTitle;
      if (urls !== undefined) updateData.urls = urls;

      let contact = await client.updateContact(contactId, updateData);

      return {
        output: {
          contactId: String(contact.id),
          firstName: contact.first_name,
          lastName: contact.last_name,
          displayName: contact.display_name
        },
        message: `Updated contact **${contact.display_name || contactId}**`
      };
    }

    if (action === 'upsert') {
      if (!externalUid) throw new Error('External UID is required for upsert');

      let contact = await client.createOrUpdateContact({
        uid: externalUid,
        first_name: firstName,
        last_name: lastName,
        phones,
        emails,
        company_name: companyName,
        job_title: jobTitle,
        urls
      });

      return {
        output: {
          contactId: String(contact.id),
          firstName: contact.first_name,
          lastName: contact.last_name,
          displayName: contact.display_name
        },
        message: `Upserted contact **${contact.display_name || externalUid}**`
      };
    }

    if (action === 'delete') {
      if (!contactId) throw new Error('Contact ID is required for delete');

      await client.deleteContact(contactId);

      return {
        output: {
          contactId,
          deleted: true
        },
        message: `Deleted contact **${contactId}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
