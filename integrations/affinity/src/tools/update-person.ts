import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let updatePerson = SlateTool.create(spec, {
  name: 'Update Person',
  key: 'update_person',
  description: `Update an existing person record in Affinity. Provide only the fields you want to change. Emails and organization associations will be replaced entirely if provided.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      emails: z
        .array(z.string())
        .optional()
        .describe('New list of email addresses (replaces existing)'),
      organizationIds: z
        .array(z.number())
        .optional()
        .describe('New list of organization IDs (replaces existing)')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the updated person'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      primaryEmail: z.string().nullable().describe('Primary email address'),
      emails: z.array(z.string()).describe('All email addresses'),
      organizationIds: z.array(z.number()).describe('Associated organization IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let p = await client.updatePerson(ctx.input.personId, {
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
      message: `Updated person **${p.first_name} ${p.last_name}** (ID: ${p.id}).`
    };
  })
  .build();
