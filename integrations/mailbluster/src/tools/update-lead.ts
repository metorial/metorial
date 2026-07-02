import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Updates an existing lead's properties by their email address. You can modify the lead's name, subscription status, custom fields, timezone, tags, and more. Only the provided fields are updated.`,
  instructions: [
    'Identify the lead by their email address.',
    'Only include fields you want to change; omitted fields remain unchanged.'
  ],
  constraints: [
    'Only single lead updates are supported via the API.',
    'Rate limit: 10 requests/second, 100 requests/minute.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the lead to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      subscribed: z.boolean().optional().describe('Updated subscription status'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom fields to update as merge tag key-value pairs'),
      timezone: z.string().optional().describe('Updated timezone'),
      ipAddress: z.string().optional().describe('Updated IP address'),
      tags: z.array(z.string()).optional().describe('Updated tags list')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address of the lead'),
      firstName: z.string().nullable().describe('First name of the lead'),
      lastName: z.string().nullable().describe('Last name of the lead'),
      fullName: z.string().nullable().describe('Full name of the lead'),
      subscribed: z.boolean().describe('Whether the lead is subscribed'),
      timezone: z.string().nullable().describe('Timezone of the lead'),
      ipAddress: z.string().nullable().describe('IP address of the lead'),
      fields: z
        .record(z.string(), z.string())
        .describe('Custom field values keyed by merge tag'),
      tags: z.array(z.string()).describe('Tags assigned to the lead'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { email, ...updateData } = ctx.input;
    let lead = await client.updateLead(email, updateData);

    return {
      output: {
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        fullName: lead.fullName,
        subscribed: lead.subscribed,
        timezone: lead.timezone,
        ipAddress: lead.ipAddress,
        fields: lead.fields || {},
        tags: lead.tags || [],
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt
      },
      message: `Lead **${lead.email}** updated successfully.`
    };
  })
  .build();
