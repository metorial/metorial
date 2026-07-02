import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      limit: z.number().optional().describe('Maximum number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      departments: z.array(departmentSchema).optional().describe('List of departments'),
      locations: z.array(locationSchema).optional().describe('List of locations'),
      nextCursor: z.string().nullable().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let type = ctx.input.resourceType ?? 'both';
    let departments: any[] | undefined;
    let locations: any[] | undefined;
    let nextCursor: string | null = null;

    if (type === 'departments' || type === 'both') {
      let result = await client.listDepartments({
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      });
      departments = result.items.map((d: any) => ({
        departmentId: d.id,
        name: d.name ?? null,
        description: d.description ?? null
      }));
      nextCursor = result.next_cursor;
    }

    if (type === 'locations' || type === 'both') {
      let result = await client.listLocations({
        cursor: type === 'locations' ? ctx.input.cursor : undefined,
        limit: ctx.input.limit
      });
      locations = result.items.map((l: any) => ({
        locationId: l.id,
        name: l.name ?? null,
        description: l.description ?? null
      }));
      if (type === 'locations') nextCursor = result.next_cursor;
    }

    let parts: string[] = [];
    if (departments) parts.push(`**${departments.length}** department(s)`);
    if (locations) parts.push(`**${locations.length}** location(s)`);

    return {
      output: {
        departments,
        locations,
        nextCursor
      },
      message: `Found ${parts.join(' and ')}.`
    };
  })
  .build();
