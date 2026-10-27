import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from '../lib/client';
import { highLevelScope } from '../lib/scopes';
import { spec } from '../spec';

let connectedLocationId = z
  .string()
  .min(1)
  .optional()
  .describe('Defaults to the connected sub-account; a different location ID is rejected');

let locationSchema = z
  .object({
    id: z.string().describe('Sub-account ID'),
    name: z.string().optional().describe('Sub-account name'),
    companyId: z.string().optional().describe('Parent company ID'),
    timezone: z.string().nullish().describe('Sub-account time zone'),
    email: z.string().nullish().describe('Sub-account email address'),
    phone: z.string().nullish().describe('Sub-account phone number'),
    website: z.string().nullish().describe('Business website'),
    address: z.string().nullish().describe('Street address'),
    city: z.string().nullish().describe('City'),
    state: z.string().nullish().describe('State or region'),
    country: z.string().nullish().describe('Country'),
    postalCode: z.string().nullish().describe('Postal code')
  })
  .passthrough();

let customFieldSchema = z
  .object({
    id: z.string().describe('Custom field ID for contact or opportunity updates'),
    name: z.string().describe('Custom field name'),
    fieldKey: z.string().optional().describe('Provider field key'),
    dataType: z.string().optional().describe('Provider data type'),
    locationId: z.string().optional().describe('Sub-account that owns the field'),
    model: z.string().optional().describe('Resource model containing the field'),
    position: z.number().optional().describe('Display position'),
    picklistOptions: z.array(z.string()).optional().describe('Allowed picklist values')
  })
  .passthrough();

let getLocation = SlateTool.create(spec, {
  name: 'Get Connected Sub-Account',
  key: 'locations_get_location',
  description:
    'Identify the connected HighLevel sub-account and retrieve its business details. Defaults to the account selected during connection.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(highLevelScope('locations.readonly'))
  .input(z.object({ locationId: connectedLocationId }))
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account ID'),
      name: z.string().nullable().describe('Sub-account name, when provided'),
      companyId: z.string().nullable().describe('Parent company ID, when provided'),
      timezone: z.string().nullable().describe('Sub-account time zone, when configured'),
      location: locationSchema.describe('Sub-account details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createHighLevelClient(ctx.auth);
    client.assertLocation(ctx.input.locationId);
    let response = await client.request<unknown>({
      method: 'GET',
      path: `/locations/${encodeURIComponent(client.locationId)}`,
      scope: 'locations.readonly'
    });
    let parsed = z.object({ location: locationSchema }).safeParse(response);
    if (!parsed.success) {
      throw createApiServiceError('HighLevel returned an unexpected sub-account response.');
    }
    let location = parsed.data.location;
    client.assertLocation(location.id);
    return {
      output: {
        locationId: location.id,
        name: location.name ?? null,
        companyId: location.companyId ?? null,
        timezone: location.timezone ?? null,
        location
      },
      message: `Connected to HighLevel sub-account ${location.name ?? location.id}.`
    };
  })
  .build();

let getCustomFields = SlateTool.create(spec, {
  name: 'Get Custom Fields',
  key: 'locations_get_custom_fields',
  description:
    'Discover custom field IDs, names, and data types for contacts and opportunities in the connected sub-account.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(highLevelScope('locations/customFields.readonly'))
  .input(
    z.object({
      locationId: connectedLocationId,
      model: z
        .enum(['contact', 'opportunity', 'all'])
        .optional()
        .describe('Filter by resource model, or request all custom fields')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account ID'),
      customFields: z.array(customFieldSchema).describe('Custom fields returned by HighLevel'),
      count: z.number().describe('Number of returned custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createHighLevelClient(ctx.auth);
    client.assertLocation(ctx.input.locationId);
    let response = await client.request<unknown>({
      method: 'GET',
      path: `/locations/${encodeURIComponent(client.locationId)}/customFields`,
      scope: 'locations/customFields.readonly',
      query: { model: ctx.input.model }
    });
    let parsed = z.object({ customFields: z.array(customFieldSchema) }).safeParse(response);
    if (!parsed.success) {
      throw createApiServiceError('HighLevel returned an unexpected custom fields response.');
    }
    for (let field of parsed.data.customFields) client.assertLocation(field.locationId);
    return {
      output: {
        locationId: client.locationId,
        customFields: parsed.data.customFields,
        count: parsed.data.customFields.length
      },
      message: `Retrieved ${parsed.data.customFields.length} custom fields.`
    };
  })
  .build();

export let locationsTools = [getLocation, getCustomFields];
