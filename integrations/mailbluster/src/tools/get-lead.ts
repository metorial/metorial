import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieves a lead's details by their email address. Returns all lead properties including name, subscription status, custom fields, tags, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the lead to retrieve')
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

    let lead = await client.getLead(ctx.input.email);

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
      message: `Retrieved lead **${lead.email}** — ${lead.subscribed ? 'subscribed' : 'unsubscribed'}.`
    };
  })
  .build();
