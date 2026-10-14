import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let upsertCompany = SlateTool.create(spec, {
  name: 'Create or Update Company',
  key: 'upsert_company',
  description:
    'Create a Chameleon company by external UID, or update an existing company by Chameleon ID or UID. Send account properties used to target and personalize experiences.',
  instructions: [
    'Provide uid when creating a new company. For an existing company, provide companyId or uid. Use properties for custom fields such as name, domain, plan, or contract value.'
  ]
})
  .input(
    z.object({
      companyId: z
        .string()
        .min(1)
        .optional()
        .describe('Existing Chameleon company ID. Call list_companies to discover IDs.'),
      uid: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Stable external company identifier from your backend. Required when creating a new company.'
        ),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Custom company properties sent as top-level fields; use dedicated inputs for identifiers'
        )
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('Created or updated Chameleon company ID'),
      company: z
        .record(z.string(), z.unknown())
        .describe('Company returned by Chameleon; may contain only its ID')
    })
  )
  .handleInvocation(async ctx => {
    let company = await new ChameleonClient(ctx.auth.token).upsertCompany(ctx.input);
    return {
      output: { companyId: company.id, company },
      message: `Saved company **${company.id}**. Call list_companies with this ID for its full properties.`
    };
  })
  .build();
