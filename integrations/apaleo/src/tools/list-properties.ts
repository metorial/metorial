import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let listProperties = SlateTool.create(spec, {
  name: 'List Properties',
  key: 'list_properties',
  description: `List a page of properties (hotels/apartments) in the account. Returns each property's ID, name, location, and status. Use this to discover available properties before querying other resources.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number, starting at 1.'),
      pageSize: z.number().optional().describe('Results per page, up to 500.')
    })
  )
  .output(
    z.object({
      properties: z
        .array(
          z
            .object({
              propertyId: z
                .string()
                .describe(
                  'Property ID. Call list_properties to discover available properties.'
                ),
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
    let result = await client.listProperties(ctx.input);

    let properties = (result.properties || []).map((p: any) => ({
      propertyId: p.id ?? undefined,
      name: p.name ?? undefined,
      description: p.description ?? undefined,
      companyName: p.companyName ?? undefined,
      commercialRegisterEntry: p.commercialRegisterEntry ?? undefined,
      taxId: p.taxId ?? undefined,
      location:
        (p.location ?? undefined)
          ? {
              addressLine1: p.location.addressLine1 ?? undefined,
              postalCode: p.location.postalCode ?? undefined,
              city: p.location.city ?? undefined,
              countryCode: p.location.countryCode ?? undefined
            }
          : undefined,
      timeZone: p.timeZone ?? undefined,
      currencyCode: p.currencyCode ?? undefined,
      status: p.status ?? undefined,
      created: p.created ?? undefined
    }));

    return {
      output: { properties },
      message: `Found **${properties.length}** properties.`
    };
  })
  .build();
