import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's properties in sevDesk. Only the provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      familyName: z.string().optional().describe('Updated family/last name'),
      firstName: z.string().optional().describe('Updated first name'),
      companyName: z.string().optional().describe('Updated company name'),
      customerNumber: z.string().optional().describe('Updated customer number'),
      description: z.string().optional().describe('Updated description'),
      vatNumber: z.string().optional().describe('Updated VAT number'),
      gender: z.enum(['m', 'w', '']).optional().describe('Updated gender'),
      academicTitle: z.string().optional().describe('Updated academic title'),
      categoryId: z.string().optional().describe('Updated category ID'),
      parentContactId: z.string().optional().describe('Updated parent contact ID')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the updated contact'),
      name: z.string().optional().describe('Updated display name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.familyName !== undefined) data.familyname = ctx.input.familyName;
    if (ctx.input.firstName !== undefined) data.surename = ctx.input.firstName;
    if (ctx.input.companyName !== undefined) data.name = ctx.input.companyName;
    if (ctx.input.customerNumber !== undefined) data.customerNumber = ctx.input.customerNumber;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.vatNumber !== undefined) data.vatNumber = ctx.input.vatNumber;
    if (ctx.input.gender !== undefined) data.gender = ctx.input.gender;
    if (ctx.input.academicTitle !== undefined) data.academicTitle = ctx.input.academicTitle;
    if (ctx.input.categoryId !== undefined) {
      data.category = { id: ctx.input.categoryId, objectName: 'Category' };
    }
    if (ctx.input.parentContactId !== undefined) {
      data.parent = { id: ctx.input.parentContactId, objectName: 'Contact' };
    }

    let contact = await client.updateContact(ctx.input.contactId, data);
    let displayName =
      contact.name || [contact.surename, contact.familyname].filter(Boolean).join(' ') || '';

    return {
      output: {
        contactId: String(contact.id),
        name: displayName || undefined
      },
      message: `Updated contact **${displayName}** (ID: ${contact.id}).`
    };
  })
  .build();
