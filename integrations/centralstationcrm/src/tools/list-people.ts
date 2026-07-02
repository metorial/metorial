import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let personSchema = z.object({
  personId: z.number().describe('Person ID'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `List people (contacts) in CentralStationCRM with pagination. Optionally search by query or include related data like companies and tags.`,
  constraints: ['Maximum 250 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to filter people by name, email, or phone'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 250)'),
      includes: z
        .string()
        .optional()
        .describe('Comma-separated list of related data to include (e.g., "companies,tags")')
    })
  )
  .output(
    z.object({
      people: z.array(personSchema).describe('List of people'),
      count: z.number().describe('Number of people returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result: any;
    if (ctx.input.query) {
      result = await client.searchPeople(ctx.input.query, {
        page: ctx.input.page,
        perpage: ctx.input.perPage
      });
    } else {
      result = await client.listPeople({
        page: ctx.input.page,
        perpage: ctx.input.perPage,
        includes: ctx.input.includes
      });
    }

    let items = Array.isArray(result) ? result : [];
    let people = items.map((item: any) => {
      let person = item?.person ?? item;
      return {
        personId: person.id,
        firstName: person.first_name,
        lastName: person.name,
        createdAt: person.created_at,
        updatedAt: person.updated_at
      };
    });

    return {
      output: {
        people,
        count: people.length
      },
      message: `Found **${people.length}** people${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
