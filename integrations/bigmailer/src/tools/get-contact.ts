import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact by ID or email address. Returns full contact details including field values, list memberships, bounce counts, complaint counts, and subscription status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand the contact belongs to'),
      contactId: z.string().describe('Contact ID or email address')
    })
  )
  .output(
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
      unsubscribeAll: z.boolean().describe('Whether contact unsubscribed from all messages'),
      unsubscribeIds: z
        .array(z.string())
        .describe('Message type IDs the contact unsubscribed from'),
      softBounces: z.number().describe('Number of soft bounces'),
      hardBounces: z.number().describe('Number of hard bounces'),
      complaints: z.number().describe('Number of complaints'),
      createdAt: z.string().describe('Creation timestamp (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let c = await client.getContact(ctx.input.brandId, ctx.input.contactId);

    return {
      output: {
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
      },
      message: `Retrieved contact **${c.email}** (${c.id}).`
    };
  })
  .build();
