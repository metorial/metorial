import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Altoviz.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional(),
      lastName: z.string().describe('Contact last name'),
      email: z.string().optional(),
      phone: z.string().optional(),
      cellPhone: z.string().optional(),
      title: z.string().optional(),
      internalId: z
        .string()
        .optional()
        .describe('Your custom internal ID for mapping to your own system'),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Altoviz contact ID'),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      email: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createContact(ctx.input);

    return {
      output: {
        contactId: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email
      },
      message: `Created contact **${[result.firstName, result.lastName].filter(Boolean).join(' ')}** (ID: ${result.id}).`
    };
  })
  .build();
