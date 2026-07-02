import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upsertContact = SlateTool.create(spec, {
  name: 'Upsert Contact',
  key: 'upsert_contact',
  description: `Create or update a contact by email address. If the email does not exist, a new contact is created. If the email exists, the existing contact is updated. Supports email validation and custom field values.`,
  instructions: [
    'Set validate to true to check email deliverability before creating/updating the contact.',
    'Field values support string, date (YYYY-MM-DD), and integer types.'
  ]
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      email: z.string().describe('Email address of the contact'),
      fieldValues: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            stringValue: z.string().optional().describe('String value'),
            dateValue: z.string().optional().describe('Date value (YYYY-MM-DD)'),
            integerValue: z.number().optional().describe('Integer value')
          })
        )
        .optional()
        .describe('Custom field values for the contact'),
      listIds: z.array(z.string()).optional().describe('IDs of lists to add the contact to'),
      unsubscribeAll: z.boolean().optional().describe('Unsubscribe from all message types'),
      unsubscribeIds: z
        .array(z.string())
        .optional()
        .describe('Message type IDs to unsubscribe from'),
      validate: z.boolean().optional().describe('Validate email deliverability before saving')
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
            dateValue: z.string().optional().describe('Date field value'),
            integerValue: z.number().optional().describe('Integer field value')
          })
        )
        .describe('Custom field values'),
      listIds: z.array(z.string()).describe('List memberships'),
      unsubscribeAll: z.boolean().describe('Whether unsubscribed from all'),
      unsubscribeIds: z.array(z.string()).describe('Unsubscribed message type IDs'),
      softBounces: z.number().describe('Soft bounce count'),
      hardBounces: z.number().describe('Hard bounce count'),
      complaints: z.number().describe('Complaint count'),
      createdAt: z.string().describe('Creation timestamp (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let fieldValues = ctx.input.fieldValues?.map(fv => ({
      name: fv.name,
      ...(fv.stringValue !== undefined ? { string: fv.stringValue } : {}),
      ...(fv.dateValue !== undefined ? { date: fv.dateValue } : {}),
      ...(fv.integerValue !== undefined ? { integer: fv.integerValue } : {})
    }));

    let c = await client.upsertContact(
      ctx.input.brandId,
      {
        email: ctx.input.email,
        field_values: fieldValues,
        list_ids: ctx.input.listIds,
        unsubscribe_all: ctx.input.unsubscribeAll,
        unsubscribe_ids: ctx.input.unsubscribeIds
      },
      ctx.input.validate
    );

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
      message: `Upserted contact **${c.email}** (${c.id}).`
    };
  })
  .build();
