import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Updates an existing contact's details. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      name: z.string().optional().describe('Updated name'),
      email: z.string().optional().describe('Updated email'),
      phone: z.string().optional().describe('Updated phone'),
      mobile: z.string().optional().describe('Updated mobile'),
      address: z.string().optional().describe('Updated address'),
      jobTitle: z.string().optional().describe('Updated job title'),
      companyId: z.number().optional().describe('Updated company association'),
      description: z.string().optional().describe('Updated description'),
      language: z.string().optional().describe('Updated language preference'),
      timezone: z.string().optional().describe('Updated timezone'),
      tags: z.array(z.string()).optional().describe('Updated tags (replaces existing)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs to update')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the updated contact'),
      name: z.string().describe('Updated name'),
      email: z.string().nullable().describe('Updated email'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
    if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
    if (ctx.input.mobile !== undefined) updateData.mobile = ctx.input.mobile;
    if (ctx.input.address !== undefined) updateData.address = ctx.input.address;
    if (ctx.input.jobTitle !== undefined) updateData.job_title = ctx.input.jobTitle;
    if (ctx.input.companyId !== undefined) updateData.company_id = ctx.input.companyId;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.language !== undefined) updateData.language = ctx.input.language;
    if (ctx.input.timezone !== undefined) updateData.time_zone = ctx.input.timezone;
    if (ctx.input.tags !== undefined) updateData.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined)
      updateData.custom_fields = ctx.input.customFields;

    let contact = await client.updateContact(ctx.input.contactId, updateData);

    return {
      output: {
        contactId: contact.id,
        name: contact.name,
        email: contact.email ?? null,
        updatedAt: contact.updated_at
      },
      message: `Updated contact **${contact.name}** (ID: ${contact.id})`
    };
  })
  .build();
