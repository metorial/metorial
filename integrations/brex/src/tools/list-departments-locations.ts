import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail } from '../lib/validation';
import { spec } from '../spec';

let departmentSchema = z.object({
  departmentId: z.string().describe('Unique identifier of the department'),
  name: z.string().nullable().optional().describe('Department name'),
  description: z.string().nullable().optional().describe('Department description')
});

let locationSchema = z.object({
  locationId: z.string().describe('Unique identifier of the location'),
  name: z.string().nullable().optional().describe('Location name'),
  description: z.string().nullable().optional().describe('Location description')
});

export let listDepartmentsLocations = SlateTool.create(spec, {
  name: 'List Departments & Locations',
  key: 'list_departments_locations',
  description: `List departments and/or locations in your Brex account. Use **resourceType** to filter by departments, locations, or retrieve both. Useful for mapping organizational structure when inviting users or managing budgets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['departments', 'locations', 'both'])
        .optional()
        .describe('Which resources to list (defaults to both)'),
      departmentCursor: z
        .string()
        .optional()
        .describe('Department continuation for both mode.'),
      locationCursor: z.string().optional().describe('Location continuation for both mode.'),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      limit: z.number().optional().describe('Maximum number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      departments: z.array(departmentSchema).optional().describe('List of departments'),
      locations: z.array(locationSchema).optional().describe('List of locations'),
      departmentNextCursor: z.string().nullable().optional(),
      locationNextCursor: z.string().nullable().optional(),
      nextCursor: z.string().nullable().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    const type = ctx.input.resourceType ?? 'both';
    if (type === 'both' && ctx.input.cursor !== undefined)
      fail(
        'For both mode, use departmentCursor and locationCursor independently, or select one resourceType to use cursor.'
      );
    const client = new Client({ token: ctx.auth.token });
    const departments =
      type !== 'locations'
        ? await client.listDepartments({
            cursor: type === 'both' ? ctx.input.departmentCursor : ctx.input.cursor,
            limit: ctx.input.limit
          })
        : undefined;
    const locations =
      type !== 'departments'
        ? await client.listLocations({
            cursor: type === 'both' ? ctx.input.locationCursor : ctx.input.cursor,
            limit: ctx.input.limit
          })
        : undefined;
    return {
      output: {
        departments: departments?.items.map(v => ({
          departmentId: v.id,
          name: v.name,
          description: v.description
        })),
        locations: locations?.items.map(v => ({
          locationId: v.id,
          name: v.name,
          description: v.description
        })),
        nextCursor:
          type === 'departments'
            ? departments!.next_cursor
            : type === 'locations'
              ? locations!.next_cursor
              : null,
        departmentNextCursor: departments?.next_cursor,
        locationNextCursor: locations?.next_cursor
      },
      message:
        'Returned the requested organization pages. Continue each collection with its own cursor.'
    };
  })
  .build();
