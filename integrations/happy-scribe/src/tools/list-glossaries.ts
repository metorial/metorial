import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationId, rawSchema } from '../lib/responses';
import { spec } from '../spec';

export let listGlossaries = SlateTool.create(spec, {
  name: 'List Glossaries',
  key: 'list_glossaries',
  description: `List available glossaries within an organization. Glossaries define source-to-target terminology mappings and can be attached to transcription or translation orders for consistent handling of domain-specific terms.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe(
          'Organization ID. Call list_organizations to discover IDs. Falls back to the saved setting.'
        )
    })
  )
  .output(
    z.object({
      glossaries: z
        .array(
          z.object({
            glossaryId: z.string().describe('ID of the glossary.'),
            name: z.string().describe('Name of the glossary.'),
            sourceLanguage: z.string().optional().nullable().describe('Source language code.'),
            targetLanguages: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Target language codes.'),
            organizationDefault: z
              .boolean()
              .optional()
              .describe('Whether this is the default glossary for the organization.'),
            createdAt: z.string().optional().describe('Creation timestamp.'),
            updatedAt: z.string().optional().describe('Last update timestamp.'),
            raw: rawSchema.optional().describe('Complete glossary metadata.')
          })
        )
        .describe('List of glossaries.')
    })
  )
  .handleInvocation(async ctx => {
    let orgId = organizationId(ctx.input.organizationId, ctx.config.organizationId);

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listGlossaries(orgId);

    let glossaries = result.map(g => ({
      glossaryId: String(g.id),
      name: g.name,
      sourceLanguage: g.source_language,
      targetLanguages: g.target_languages,
      organizationDefault: g.organization_default ?? undefined,
      createdAt: g.created_at ?? undefined,
      updatedAt: g.updated_at ?? undefined,
      raw: g
    }));

    return {
      output: {
        glossaries
      },
      message: `Found **${glossaries.length}** glossary(ies).`
    };
  })
  .build();
