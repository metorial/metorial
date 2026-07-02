import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Add a new contact to the address book. Contacts serve as reusable destinations for route planning.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      address1: z.string().describe('Street address'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      email: z.string().optional().describe('Contact email'),
      phone: z.string().optional().describe('Contact phone'),
      cachedLat: z.number().optional().describe('Latitude'),
      cachedLng: z.number().optional().describe('Longitude'),
      addressCity: z.string().optional().describe('City'),
      addressStateId: z.string().optional().describe('State/province code'),
      addressZip: z.string().optional().describe('ZIP/postal code'),
      addressCountryId: z.string().optional().describe('Country code'),
      addressGroup: z.string().optional().describe('Contact group name'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata')
    })
  )
  .output(
    z.object({
      addressId: z.number().describe('Created contact address book ID'),
      address1: z.string().optional().describe('Street address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {
      address_1: ctx.input.address1,
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      address_email: ctx.input.email,
      address_phone_number: ctx.input.phone,
      cached_lat: ctx.input.cachedLat,
      cached_lng: ctx.input.cachedLng,
      address_city: ctx.input.addressCity,
      address_state_id: ctx.input.addressStateId,
      address_zip: ctx.input.addressZip,
      address_country_id: ctx.input.addressCountryId,
      address_group: ctx.input.addressGroup,
      address_custom_data: ctx.input.customFields
    };

    let result = await client.createContact(body);

    return {
      output: {
        addressId: result.address_id,
        address1: result.address_1
      },
      message: `Created contact **${result.address_id}** at "${ctx.input.address1}".`
    };
  })
  .build();

export let getContacts = SlateTool.create(spec, {
  name: 'Get Contacts',
  key: 'get_contacts',
  description: `Search and retrieve contacts from the address book. Supports filtering by query text and retrieving specific contacts by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z
        .string()
        .optional()
        .describe('Specific address ID(s) to retrieve (comma-separated)'),
      query: z.string().optional().describe('Search query to filter contacts'),
      limit: z.number().optional().describe('Max number of contacts to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            addressId: z.number().describe('Address book ID'),
            address1: z.string().optional().describe('Street address'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email'),
            phone: z.string().optional().describe('Phone'),
            lat: z.number().optional().describe('Latitude'),
            lng: z.number().optional().describe('Longitude'),
            addressCity: z.string().optional().describe('City'),
            addressGroup: z.string().optional().describe('Group')
          })
        )
        .describe('List of contacts'),
      total: z.number().optional().describe('Total contacts matching query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getContacts({
      addressId: ctx.input.addressId,
      query: ctx.input.query,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let items = result.results || (Array.isArray(result) ? result : []);

    return {
      output: {
        contacts: items.map((c: any) => ({
          addressId: c.address_id,
          address1: c.address_1,
          firstName: c.first_name,
          lastName: c.last_name,
          email: c.address_email,
          phone: c.address_phone_number,
          lat: c.cached_lat,
          lng: c.cached_lng,
          addressCity: c.address_city,
          addressGroup: c.address_group
        })),
        total: result.total
      },
      message: `Retrieved ${items.length} contact(s).`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in the address book.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      addressId: z.number().describe('Address book ID to update'),
      address1: z.string().optional().describe('New street address'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      email: z.string().optional().describe('New email'),
      phone: z.string().optional().describe('New phone'),
      cachedLat: z.number().optional().describe('New latitude'),
      cachedLng: z.number().optional().describe('New longitude'),
      addressCity: z.string().optional().describe('New city'),
      addressGroup: z.string().optional().describe('New group')
    })
  )
  .output(
    z.object({
      addressId: z.number().describe('Updated contact ID'),
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {
      address_id: ctx.input.addressId
    };
    if (ctx.input.address1) body.address_1 = ctx.input.address1;
    if (ctx.input.firstName) body.first_name = ctx.input.firstName;
    if (ctx.input.lastName) body.last_name = ctx.input.lastName;
    if (ctx.input.email) body.address_email = ctx.input.email;
    if (ctx.input.phone) body.address_phone_number = ctx.input.phone;
    if (ctx.input.cachedLat !== undefined) body.cached_lat = ctx.input.cachedLat;
    if (ctx.input.cachedLng !== undefined) body.cached_lng = ctx.input.cachedLng;
    if (ctx.input.addressCity) body.address_city = ctx.input.addressCity;
    if (ctx.input.addressGroup) body.address_group = ctx.input.addressGroup;

    await client.updateContact(body);

    return {
      output: { addressId: ctx.input.addressId, success: true },
      message: `Updated contact **${ctx.input.addressId}**.`
    };
  })
  .build();

export let deleteContacts = SlateTool.create(spec, {
  name: 'Delete Contacts',
  key: 'delete_contacts',
  description: `Delete one or more contacts from the address book. This action is permanent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      addressIds: z.array(z.number()).describe('Address book IDs to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether deletion succeeded'),
      count: z.number().describe('Number of contacts deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteContacts(ctx.input.addressIds);
    return {
      output: { deleted: true, count: ctx.input.addressIds.length },
      message: `Deleted ${ctx.input.addressIds.length} contact(s).`
    };
  })
  .build();
