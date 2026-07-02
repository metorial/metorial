import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getPersons = SlateTool.create(spec, {
  name: 'Get Persons',
  key: 'get_persons',
  description: `Retrieve person contacts from Pipedrive. Fetch a single person by ID or list persons with filtering. Returns contact info, linked organization, and associated deals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Specific person ID to fetch'),
      filterId: z.number().optional().describe('Filter ID for custom filtering'),
      start: z.number().optional().describe('Pagination start (0-based)'),
      limit: z.number().optional().describe('Number of results to return (max 500)'),
      sort: z.string().optional().describe('Sort field and direction, e.g. "name ASC"')
    })
  )
  .output(
    z.object({
      persons: z
        .array(
          z.object({
            personId: z.number().describe('Person ID'),
            name: z.string().describe('Person name'),
            primaryEmail: z.string().optional().nullable().describe('Primary email'),
            primaryPhone: z.string().optional().nullable().describe('Primary phone'),
            organizationName: z
              .string()
              .optional()
              .nullable()
              .describe('Linked organization name'),
            organizationId: z
              .number()
              .optional()
              .nullable()
              .describe('Linked organization ID'),
            ownerName: z.string().optional().describe('Owner user name'),
            openDealsCount: z.number().optional().describe('Number of open deals'),
            addTime: z.string().optional().describe('Creation timestamp'),
            updateTime: z.string().optional().nullable().describe('Last update timestamp')
          })
        )
        .describe('List of persons'),
      totalCount: z.number().optional().describe('Total matching count'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.personId) {
      let result = await client.getPerson(ctx.input.personId);
      let p = result?.data;
      let primaryEmail =
        p?.primary_email ??
        (Array.isArray(p?.email) ? p.email.find((e: any) => e.primary)?.value : null);
      let primaryPhone = Array.isArray(p?.phone)
        ? p.phone.find((ph: any) => ph.primary)?.value
        : null;

      return {
        output: {
          persons: p
            ? [
                {
                  personId: p.id,
                  name: p.name,
                  primaryEmail,
                  primaryPhone,
                  organizationName: p.org_id?.name ?? null,
                  organizationId: p.org_id?.value ?? null,
                  ownerName: p.owner_id?.name,
                  openDealsCount: p.open_deals_count,
                  addTime: p.add_time,
                  updateTime: p.update_time
                }
              ]
            : [],
          totalCount: p ? 1 : 0
        },
        message: p ? `Found person **"${p.name}"** (ID: ${p.id}).` : 'Person not found.'
      };
    }

    let result = await client.getPersons({
      start: ctx.input.start,
      limit: ctx.input.limit,
      filterId: ctx.input.filterId,
      sort: ctx.input.sort
    });

    let persons = (result?.data || []).map((p: any) => {
      let primaryEmail =
        p?.primary_email ??
        (Array.isArray(p?.email) ? p.email.find((e: any) => e.primary)?.value : null);
      let primaryPhone = Array.isArray(p?.phone)
        ? p.phone.find((ph: any) => ph.primary)?.value
        : null;

      return {
        personId: p.id,
        name: p.name,
        primaryEmail,
        primaryPhone,
        organizationName: p.org_id?.name ?? p.org_name ?? null,
        organizationId: p.org_id?.value ?? null,
        ownerName: p.owner_id?.name ?? p.owner_name,
        openDealsCount: p.open_deals_count,
        addTime: p.add_time,
        updateTime: p.update_time
      };
    });

    return {
      output: {
        persons,
        totalCount: result?.additional_data?.pagination?.total_count,
        hasMore: result?.additional_data?.pagination?.more_items_in_collection ?? false
      },
      message: `Found **${persons.length}** person(s).`
    };
  });
