import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
        .describe('Organization ID. Falls back to the value in config if not provided.')
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
            updatedAt: z.string().optional().describe('Last update timestamp.')
          })
        )
        .describe('List of glossaries.')
    })
  )
  .handleInvocation(async ctx => {
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) {
      throw new Error(
        'Organization ID is required. Provide it in the input or configure it globally.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listGlossaries(orgId);

    let glossaries = (result.results || result || []).map((g: any) => ({
      glossaryId: g.id,
      name: g.name,
      sourceLanguage: g.source_language,
      targetLanguages: g.target_languages,
      organizationDefault: g.organization_default,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    }));

    return {
      output: {
        glossaries
      },
      message: `Found **${glossaries.length}** glossary(ies).`
    };
  })
  .build();
