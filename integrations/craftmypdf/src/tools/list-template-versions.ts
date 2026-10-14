import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplateVersions = SlateTool.create(spec, {
  name: 'List Template Versions',
  key: 'list_template_versions',
  description:
    'List the available versions of a template to choose a version for generation, retrieval, or cloning. Version zero represents the latest version.',
  tags: { readOnly: true }
})
  .input(z.object({ templateId: z.string().min(1).describe('Template ID to inspect.') }))
  .output(
    z.object({
      templateId: z.string().describe('Template ID.'),
      versions: z
        .array(
          z.object({
            version: z.number().describe('Version number; zero selects the latest version.'),
            description: z.string().optional().describe('Version description when available.'),
            updatedAt: z
              .string()
              .optional()
              .describe('Version update timestamp when available.'),
            retained: z
              .boolean()
              .optional()
              .describe('Whether the version is protected from automatic cleanup.')
          })
        )
        .describe('Available template versions.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listTemplateVersions(ctx.input.templateId);
    let versions = result.versions.map(version => ({
      version: version.version,
      description: version.description,
      updatedAt: version.updated_at,
      retained: version.keep
    }));
    return {
      output: { templateId: result.template_id ?? ctx.input.templateId, versions },
      message: `Found **${versions.length}** template version(s).`
    };
  })
  .build();
