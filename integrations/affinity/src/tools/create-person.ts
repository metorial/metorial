import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let createPerson = SlateTool.create(spec, {
  name: 'Create Person',
  key: 'create_person',
  description: `Create a new person record in Affinity. You must provide a first and last name, and can optionally include email addresses and organization associations.`,
  instructions: ['Search for existing persons before creating to avoid duplicates.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the person'),
      lastName: z.string().describe('Last name of the person'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to associate with the person'),
      organizationIds: z
        .array(z.number())
        .optional()
        .describe('IDs of organizations to associate with the person')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the created person'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      primaryEmail: z.string().nullable().describe('Primary email address'),
      emails: z.array(z.string()).describe('All email addresses'),
      organizationIds: z.array(z.number()).describe('Associated organization IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let p = await client.createPerson({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      emails: ctx.input.emails,
      organization_ids: ctx.input.organizationIds
    });

    return {
      output: {
        personId: p.id,
        firstName: p.first_name ?? null,
        lastName: p.last_name ?? null,
        primaryEmail: p.primary_email ?? null,
        emails: p.emails ?? [],
        organizationIds: p.organization_ids ?? []
      },
      message: `Created person **${p.first_name} ${p.last_name}** (ID: ${p.id}).`
    };
  })
  .build();
