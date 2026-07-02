import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts within a brand. Optionally filter by a specific list. Returns contact emails, field values, list memberships, bounce/complaint counts, and subscription status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand to list contacts from'),
      listId: z.string().optional().describe('Filter contacts by this list ID'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of contacts to return (1-100). Defaults to 10.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().describe('Whether more contacts exist beyond this page'),
      cursor: z.string().describe('Cursor for fetching the next page'),
      total: z.number().describe('Total number of contacts'),
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Contact unique identifier'),
          brandId: z.string().describe('Brand the contact belongs to'),
          email: z.string().describe('Contact email address'),
          fieldValues: z
            .array(
              z.object({
                name: z.string().describe('Field name'),
                stringValue: z.string().optional().describe('String field value'),
                dateValue: z.string().optional().describe('Date field value (YYYY-MM-DD)'),
                integerValue: z.number().optional().describe('Integer field value')
              })
            )
            .describe('Custom field values'),
          listIds: z.array(z.string()).describe('IDs of lists this contact belongs to'),
          unsubscribeAll: z
            .boolean()
            .describe('Whether contact unsubscribed from all messages'),
          unsubscribeIds: z
            .array(z.string())
            .describe('Message type IDs the contact unsubscribed from'),
          softBounces: z.number().describe('Number of soft bounces'),
          hardBounces: z.number().describe('Number of hard bounces'),
          complaints: z.number().describe('Number of complaints'),
          createdAt: z.string().describe('Creation timestamp (ISO 8601)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listContacts(ctx.input.brandId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      list_id: ctx.input.listId
    });

    let contacts = result.data.map(c => ({
      contactId: c.id,
      brandId: c.brand_id,
      email: c.email,
      fieldValues: (c.field_values || []).map(fv => ({
        name: fv.name,
        stringValue: fv.string,
        dateValue: fv.date,
        integerValue: fv.integer
      })),
      listIds: c.list_ids || [],
      unsubscribeAll: c.unsubscribe_all,
      unsubscribeIds: c.unsubscribe_ids || [],
      softBounces: c.num_soft_bounces,
      hardBounces: c.num_hard_bounces,
      complaints: c.num_complaints,
      createdAt: new Date(c.created * 1000).toISOString()
    }));

    return {
      output: {
        hasMore: result.has_more,
        cursor: result.cursor,
        total: result.total,
        contacts
      },
      message: `Found **${result.total}** contact(s). Returned **${contacts.length}** contact(s)${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
