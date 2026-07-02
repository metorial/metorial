import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let updateParty = SlateTool.create(spec, {
  name: 'Update Party',
  key: 'update_party',
  description: `Update an existing contact (person or organisation) in Capsule CRM. Modify names, contact details, addresses, tags, and custom fields. Supports adding, modifying, and removing collection items.`,
  instructions: [
    'To add a new email/phone/address/website, include it without an ID.',
    'To update an existing one, include its ID and the changed fields.',
    'To delete one, include its ID with delete set to true.'
  ]
})
  .input(
    z.object({
      partyId: z.number().describe('ID of the party to update'),
      firstName: z.string().optional().describe('Updated first name (persons)'),
      lastName: z.string().optional().describe('Updated last name (persons)'),
      name: z.string().optional().describe('Updated organisation name'),
      title: z.string().optional().describe('Updated title prefix'),
      jobTitle: z.string().optional().describe('Updated job title'),
      about: z.string().optional().describe('Updated description or notes'),
      ownerId: z.number().optional().describe('New owner user ID'),
      teamId: z.number().optional().describe('New team ID'),
      emailAddresses: z
        .array(
          z.object({
            emailId: z.number().optional().describe('ID of existing email to update/delete'),
            type: z.string().optional(),
            address: z.string().optional(),
            delete: z.boolean().optional().describe('Set true to remove this email')
          })
        )
        .optional()
        .describe('Email address changes'),
      phoneNumbers: z
        .array(
          z.object({
            phoneId: z.number().optional().describe('ID of existing phone to update/delete'),
            type: z.string().optional(),
            number: z.string().optional(),
            delete: z.boolean().optional().describe('Set true to remove this phone')
          })
        )
        .optional()
        .describe('Phone number changes'),
      addresses: z
        .array(
          z.object({
            addressId: z
              .number()
              .optional()
              .describe('ID of existing address to update/delete'),
            type: z.string().optional(),
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional(),
            delete: z.boolean().optional().describe('Set true to remove this address')
          })
        )
        .optional()
        .describe('Address changes'),
      websites: z
        .array(
          z.object({
            websiteId: z
              .number()
              .optional()
              .describe('ID of existing website to update/delete'),
            type: z.string().optional(),
            address: z.string().optional(),
            delete: z.boolean().optional().describe('Set true to remove this website')
          })
        )
        .optional()
        .describe('Website changes'),
      tags: z
        .array(
          z.object({
            tagId: z.number().optional().describe('Existing tag ID'),
            name: z.string().optional().describe('Tag name')
          })
        )
        .optional()
        .describe('Tags to set (replaces existing tags)')
    })
  )
  .output(
    z.object({
      partyId: z.number().describe('ID of the updated party'),
      type: z.string().describe('Type of the party'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let party: Record<string, any> = {};

    if (ctx.input.firstName !== undefined) party.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) party.lastName = ctx.input.lastName;
    if (ctx.input.name !== undefined) party.name = ctx.input.name;
    if (ctx.input.title !== undefined) party.title = ctx.input.title;
    if (ctx.input.jobTitle !== undefined) party.jobTitle = ctx.input.jobTitle;
    if (ctx.input.about !== undefined) party.about = ctx.input.about;
    if (ctx.input.ownerId) party.owner = { id: ctx.input.ownerId };
    if (ctx.input.teamId) party.team = { id: ctx.input.teamId };

    if (ctx.input.emailAddresses) {
      party.emailAddresses = ctx.input.emailAddresses.map(e => {
        let item: Record<string, any> = {};
        if (e.emailId) item.id = e.emailId;
        if (e.type) item.type = e.type;
        if (e.address) item.address = e.address;
        if (e.delete) item._delete = true;
        return item;
      });
    }

    if (ctx.input.phoneNumbers) {
      party.phoneNumbers = ctx.input.phoneNumbers.map(p => {
        let item: Record<string, any> = {};
        if (p.phoneId) item.id = p.phoneId;
        if (p.type) item.type = p.type;
        if (p.number) item.number = p.number;
        if (p.delete) item._delete = true;
        return item;
      });
    }

    if (ctx.input.addresses) {
      party.addresses = ctx.input.addresses.map(a => {
        let item: Record<string, any> = {};
        if (a.addressId) item.id = a.addressId;
        if (a.type) item.type = a.type;
        if (a.street) item.street = a.street;
        if (a.city) item.city = a.city;
        if (a.state) item.state = a.state;
        if (a.zip) item.zip = a.zip;
        if (a.country) item.country = a.country;
        if (a.delete) item._delete = true;
        return item;
      });
    }

    if (ctx.input.websites) {
      party.websites = ctx.input.websites.map(w => {
        let item: Record<string, any> = {};
        if (w.websiteId) item.id = w.websiteId;
        if (w.type) item.type = w.type;
        if (w.address) item.address = w.address;
        if (w.delete) item._delete = true;
        return item;
      });
    }

    if (ctx.input.tags) {
      party.tags = ctx.input.tags.map(t => {
        if (t.tagId) return { id: t.tagId };
        return { name: t.name };
      });
    }

    let result = await client.updateParty(ctx.input.partyId, party);

    return {
      output: {
        partyId: result.id,
        type: result.type,
        updatedAt: result.updatedAt
      },
      message: `Updated party **#${result.id}** (${result.type}).`
    };
  })
  .build();
