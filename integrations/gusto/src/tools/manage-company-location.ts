import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageCompanyLocation = SlateTool.create(spec, {
  name: 'Manage Company Location',
  key: 'manage_company_location',
  description: `List, create, or update company locations. Locations are used for tax jurisdiction purposes and employee work addresses.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      companyId: z.string().optional().describe('Company UUID (required for list/create)'),
      locationId: z.string().optional().describe('Location UUID (required for update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      phoneNumber: z.string().optional().describe('Phone number for the location'),
      street1: z.string().optional().describe('Street address line 1'),
      street2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State abbreviation (e.g., CA, NY)'),
      zip: z.string().optional().describe('ZIP code'),
      country: z.string().optional().describe('Country (defaults to USA)'),
      mailingAddress: z.boolean().optional().describe('Whether this is a mailing address'),
      filingAddress: z.boolean().optional().describe('Whether this is a filing address')
    })
  )
  .output(
    z.object({
      locations: z
        .array(
          z.object({
            locationId: z.string().describe('UUID of the location'),
            street1: z.string().optional().describe('Street address line 1'),
            street2: z.string().optional().describe('Street address line 2'),
            city: z.string().optional().describe('City'),
            state: z.string().optional().describe('State'),
            zip: z.string().optional().describe('ZIP code'),
            phoneNumber: z.string().optional().describe('Phone number'),
            active: z.boolean().optional().describe('Whether the location is active')
          })
        )
        .optional()
        .describe('List of locations'),
      location: z
        .object({
          locationId: z.string().describe('UUID of the location'),
          street1: z.string().optional().describe('Street address line 1'),
          city: z.string().optional().describe('City'),
          state: z.string().optional().describe('State'),
          zip: z.string().optional().describe('ZIP code'),
          version: z.string().optional().describe('Current resource version')
        })
        .optional()
        .describe('Created or updated location')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.companyId) throw new Error('companyId is required');
        let result = await client.listCompanyLocations(ctx.input.companyId);
        let locations = Array.isArray(result) ? result : result.locations || result;
        let mapped = locations.map((l: any) => ({
          locationId: l.uuid || l.id?.toString(),
          street1: l.street_1,
          street2: l.street_2,
          city: l.city,
          state: l.state,
          zip: l.zip,
          phoneNumber: l.phone_number,
          active: l.active
        }));
        return {
          output: { locations: mapped },
          message: `Found **${mapped.length}** location(s).`
        };
      }
      case 'create': {
        if (!ctx.input.companyId) throw new Error('companyId is required');
        let result = await client.createCompanyLocation(ctx.input.companyId, {
          phone_number: ctx.input.phoneNumber,
          street_1: ctx.input.street1,
          street_2: ctx.input.street2,
          city: ctx.input.city,
          state: ctx.input.state,
          zip: ctx.input.zip,
          country: ctx.input.country,
          mailing_address: ctx.input.mailingAddress,
          filing_address: ctx.input.filingAddress
        });
        return {
          output: {
            location: {
              locationId: result.uuid || result.id?.toString(),
              street1: result.street_1,
              city: result.city,
              state: result.state,
              zip: result.zip,
              version: result.version
            }
          },
          message: `Created location at **${ctx.input.street1}, ${ctx.input.city}, ${ctx.input.state}**.`
        };
      }
      case 'update': {
        if (!ctx.input.locationId) throw new Error('locationId is required');
        let data: Record<string, any> = {};
        if (ctx.input.version) data.version = ctx.input.version;
        if (ctx.input.phoneNumber) data.phone_number = ctx.input.phoneNumber;
        if (ctx.input.street1) data.street_1 = ctx.input.street1;
        if (ctx.input.street2 !== undefined) data.street_2 = ctx.input.street2;
        if (ctx.input.city) data.city = ctx.input.city;
        if (ctx.input.state) data.state = ctx.input.state;
        if (ctx.input.zip) data.zip = ctx.input.zip;
        let result = await client.updateCompanyLocation(ctx.input.locationId, data);
        return {
          output: {
            location: {
              locationId: result.uuid || result.id?.toString(),
              street1: result.street_1,
              city: result.city,
              state: result.state,
              zip: result.zip,
              version: result.version
            }
          },
          message: `Updated location ${ctx.input.locationId}.`
        };
      }
    }
  })
  .build();
