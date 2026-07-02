import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let crewSchema = z.object({
  crewId: z.number().describe('Unique crew member ID'),
  firstName: z.string().optional(),
  surName: z.string().optional(),
  displayName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  function: z.string().optional().describe('Primary function/role'),
  tags: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listCrew = SlateTool.create(spec, {
  name: 'List Crew',
  key: 'list_crew',
  description: `Retrieve a list of crew members from Rentman. Browse all crew members, their roles, and contact information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().default(25).describe('Maximum number of results (max 300)'),
      offset: z.number().optional().default(0).describe('Number of results to skip'),
      sort: z.string().optional().describe('Sort field with + or - prefix'),
      fields: z.string().optional().describe('Comma-separated fields to return')
    })
  )
  .output(
    z.object({
      crew: z.array(crewSchema),
      itemCount: z.number(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('crew', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields
    });

    let crew = result.data.map((c: any) => ({
      crewId: c.id,
      firstName: c.firstname,
      surName: c.surname,
      displayName: c.displayname,
      email: c.email,
      phone: c.phone,
      city: c.city,
      country: c.country,
      street: c.street,
      postalCode: c.postal_code,
      function: c.function,
      tags: c.tags,
      createdAt: c.created,
      updatedAt: c.modified
    }));

    return {
      output: {
        crew,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset
      },
      message: `Found **${result.itemCount}** crew members. Returned ${crew.length} members (offset: ${result.offset}).`
    };
  })
  .build();
