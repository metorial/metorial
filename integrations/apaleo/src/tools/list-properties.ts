import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let listProperties = SlateTool.create(spec, {
  name: 'List Properties',
  key: 'list_properties',
  description: `List all properties (hotels/apartments) in the account. Returns each property's ID, name, location, and status. Use this to discover available properties before querying other resources.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      properties: z
        .array(
          z
            .object({
              propertyId: z.string().describe('Property ID'),
              name: z.string().optional().describe('Property name'),
              description: z.string().optional().describe('Property description'),
              companyName: z.string().optional(),
              commercialRegisterEntry: z.string().optional(),
              taxId: z.string().optional(),
              location: z
                .object({
                  addressLine1: z.string().optional(),
                  postalCode: z.string().optional(),
                  city: z.string().optional(),
                  countryCode: z.string().optional()
                })
                .optional(),
              timeZone: z.string().optional(),
              currencyCode: z.string().optional(),
              status: z.string().optional().describe('Property status (e.g., Live, Test)'),
              created: z.string().optional()
            })
            .passthrough()
        )
        .describe('List of properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    let result = await client.listProperties();

    let properties = (result.properties || []).map((p: any) => ({
      propertyId: p.id,
      name: p.name,
      description: p.description,
      companyName: p.companyName,
      commercialRegisterEntry: p.commercialRegisterEntry,
      taxId: p.taxId,
      location: p.location
        ? {
            addressLine1: p.location.addressLine1,
            postalCode: p.location.postalCode,
            city: p.location.city,
            countryCode: p.location.countryCode
          }
        : undefined,
      timeZone: p.timeZone,
      currencyCode: p.currencyCode,
      status: p.status,
      created: p.created
    }));

    return {
      output: { properties },
      message: `Found **${properties.length}** properties.`
    };
  })
  .build();
