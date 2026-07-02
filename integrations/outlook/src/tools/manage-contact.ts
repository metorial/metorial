import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  countryOrRegion: z.string().optional(),
  postalCode: z.string().optional()
});

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Update or delete an existing contact. Use **action** to specify the operation. For updates, only the provided fields will be changed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The ID of the contact to manage'),
      action: z.enum(['update', 'delete']).describe('The action to perform'),
      givenName: z.string().optional(),
      surname: z.string().optional(),
      displayName: z.string().optional(),
      emailAddresses: z
        .array(
          z.object({
            address: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      businessPhones: z.array(z.string()).optional(),
      homePhones: z.array(z.string()).optional(),
      mobilePhone: z.string().optional(),
      jobTitle: z.string().optional(),
      companyName: z.string().optional(),
      department: z.string().optional(),
      businessAddress: addressSchema.optional(),
      homeAddress: addressSchema.optional(),
      birthday: z.string().optional(),
      personalNotes: z.string().optional(),
      categories: z.array(z.string()).optional()
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      contactId: z.string(),
      displayName: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { contactId, action } = ctx.input;

    if (action === 'delete') {
      await client.deleteContact(contactId);
      return {
        output: { success: true, contactId },
        message: `Deleted contact **${contactId}**.`
      };
    }

    let updates: Record<string, any> = {};
    if (ctx.input.givenName !== undefined) updates.givenName = ctx.input.givenName;
    if (ctx.input.surname !== undefined) updates.surname = ctx.input.surname;
    if (ctx.input.displayName !== undefined) updates.displayName = ctx.input.displayName;
    if (ctx.input.emailAddresses !== undefined)
      updates.emailAddresses = ctx.input.emailAddresses;
    if (ctx.input.businessPhones !== undefined)
      updates.businessPhones = ctx.input.businessPhones;
    if (ctx.input.homePhones !== undefined) updates.homePhones = ctx.input.homePhones;
    if (ctx.input.mobilePhone !== undefined) updates.mobilePhone = ctx.input.mobilePhone;
    if (ctx.input.jobTitle !== undefined) updates.jobTitle = ctx.input.jobTitle;
    if (ctx.input.companyName !== undefined) updates.companyName = ctx.input.companyName;
    if (ctx.input.department !== undefined) updates.department = ctx.input.department;
    if (ctx.input.businessAddress !== undefined)
      updates.businessAddress = ctx.input.businessAddress;
    if (ctx.input.homeAddress !== undefined) updates.homeAddress = ctx.input.homeAddress;
    if (ctx.input.birthday !== undefined) updates.birthday = ctx.input.birthday;
    if (ctx.input.personalNotes !== undefined) updates.personalNotes = ctx.input.personalNotes;
    if (ctx.input.categories !== undefined) updates.categories = ctx.input.categories;

    let updated = await client.updateContact(contactId, updates);

    return {
      output: {
        success: true,
        contactId: updated.id,
        displayName: updated.displayName
      },
      message: `Updated contact **"${updated.displayName || '(unnamed)'}"**.`
    };
  })
  .build();
