import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Creates a new lead (subscriber) in MailBluster. If a lead with the same email already exists, you can choose to override the existing lead's info or receive an error.
Use this to add new subscribers from your website, app, or other sources.`,
  instructions: [
    'The email field is required and must be unique within a brand.',
    'Set overrideExisting to true to update an existing lead with the same email instead of failing.',
    'Custom fields should use merge tag keys (e.g., "gender", "address").'
  ],
  constraints: [
    'Only single lead additions are supported; use MailBluster app for bulk operations.',
    'Rate limit: 10 requests/second, 100 requests/minute.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the lead'),
      firstName: z.string().optional().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      subscribed: z
        .boolean()
        .optional()
        .describe('Whether the lead is subscribed to receive emails'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom fields as merge tag key-value pairs (e.g., {"gender": "Male", "address": "New York"})'
        ),
      timezone: z
        .string()
        .optional()
        .describe('Timezone of the lead (e.g., "America/New_York")'),
      ipAddress: z
        .string()
        .optional()
        .describe('IP address used to determine location metadata'),
      doubleOptIn: z
        .boolean()
        .optional()
        .describe('If true, the lead will receive an opt-in confirmation email'),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Tags to assign to the lead. Existing tags are reused; new tags are created.'
        ),
      overrideExisting: z
        .boolean()
        .optional()
        .describe(
          'If true, overrides existing lead info when a lead with the same email already exists'
        )
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

    let lead = await client.createLead(ctx.input);

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
      message: `Lead **${lead.email}** created successfully${lead.subscribed ? ' (subscribed)' : ' (unsubscribed)'}.`
    };
  })
  .build();
