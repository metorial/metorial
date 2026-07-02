import { SlateTool } from 'slates';
import { z } from 'zod';
import { freshsalesServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let filterContacts = SlateTool.create(spec, {
  name: 'Filter Contacts',
  key: 'filter_contacts',
  description: `Find Freshsales contacts that exactly match one or more filter rules. Use this for precise contact lookups such as matching an email address.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filterRules: z
        .array(
          z.object({
            attribute: z
              .string()
              .describe('Freshsales contact attribute path, e.g. "contact_email.email"'),
            operator: z.string().describe('Freshsales filtered-search operator, e.g. "is_in"'),
            value: z.string().describe('Value to match exactly')
          })
        )
        .describe('Filter rules passed to Freshsales as filter_rule'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of contacts to return per page. Freshsales allows at most 100.')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.number(),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          displayName: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          mobileNumber: z.string().nullable().optional(),
          workNumber: z.string().nullable().optional(),
          jobTitle: z.string().nullable().optional(),
          city: z.string().nullable().optional(),
          country: z.string().nullable().optional(),
          createdAt: z.string().nullable().optional(),
          updatedAt: z.string().nullable().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.filterRules.length === 0) {
      throw freshsalesServiceError('filterRules must include at least one rule.');
    }

    if (ctx.input.perPage !== undefined && ctx.input.perPage > 100) {
      throw freshsalesServiceError('perPage cannot be greater than 100.');
    }

    let client = createClient(ctx);
    let result = await client.filteredSearch('contact', ctx.input.filterRules, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let contacts = ((result.contacts as Record<string, any>[] | undefined) ?? []).map(
      contact => ({
        contactId: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        displayName: contact.display_name,
        email: contact.email,
        mobileNumber: contact.mobile_number,
        workNumber: contact.work_number,
        jobTitle: contact.job_title,
        city: contact.city,
        country: contact.country,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      })
    );

    let meta = result.meta as Record<string, any> | undefined;

    return {
      output: {
        contacts,
        total: meta?.total
      },
      message: `Found **${contacts.length}** matching contacts.`
    };
  })
  .build();
