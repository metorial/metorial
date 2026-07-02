import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `List and search people (contacts) in Pipeline CRM with optional filtering. Supports filtering by name and sorting. Returns paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 200, max: 200)'),
      personName: z.string().optional().describe('Filter by person name (partial match)'),
      companyId: z.number().optional().describe('Filter by associated company ID'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (e.g., "first_name", "last_name", "created_at")')
    })
  )
  .output(
    z.object({
      people: z
        .array(
          z.object({
            personId: z.number().describe('Unique person ID'),
            firstName: z.string().nullable().optional().describe('First name'),
            lastName: z.string().nullable().optional().describe('Last name'),
            email: z.string().nullable().optional().describe('Email address'),
            phone: z.string().nullable().optional().describe('Phone number'),
            title: z.string().nullable().optional().describe('Job title'),
            companyName: z.string().nullable().optional().describe('Associated company name'),
            userId: z.number().nullable().optional().describe('Owner user ID'),
            createdAt: z.string().nullable().optional().describe('Creation timestamp'),
            updatedAt: z.string().nullable().optional().describe('Last update timestamp')
          })
        )
        .describe('List of people'),
      totalCount: z.number().describe('Total number of matching people'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let conditions: Record<string, any> = {};
    if (ctx.input.personName) conditions.person_name = ctx.input.personName;
    if (ctx.input.companyId) conditions.person_company_id = ctx.input.companyId;

    let result = await client.listPeople({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
      sort: ctx.input.sort
    });

    let people = (result.entries ?? []).map((person: any) => ({
      personId: person.id,
      firstName: person.first_name ?? null,
      lastName: person.last_name ?? null,
      email: person.email ?? null,
      phone: person.phone ?? null,
      title: person.title ?? null,
      companyName: person.company?.name ?? null,
      userId: person.user_id ?? person.owner_id ?? null,
      createdAt: person.created_at ?? null,
      updatedAt: person.updated_at ?? null
    }));

    return {
      output: {
        people,
        totalCount: result.pagination?.total ?? people.length,
        currentPage: result.pagination?.page ?? 1,
        totalPages: result.pagination?.pages ?? 1
      },
      message: `Found **${result.pagination?.total ?? people.length}** people (page ${result.pagination?.page ?? 1} of ${result.pagination?.pages ?? 1})`
    };
  })
  .build();
