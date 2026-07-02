import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

export let lintCiConfig = SlateTool.create(spec, {
  name: 'Lint CI Config',
  key: 'lint_ci_config',
  description: `Validate a \`.gitlab-ci.yml\` configuration file for syntax errors and configuration issues. Optionally performs a dry run to simulate pipeline creation. Returns validation status, errors, warnings, and optionally the merged YAML.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      content: z.string().describe('The .gitlab-ci.yml content to validate'),
      dryRun: z
        .boolean()
        .optional()
        .describe('Simulate pipeline creation to catch runtime errors'),
      includeMergedYaml: z
        .boolean()
        .optional()
        .describe('Include the merged YAML output after includes are resolved'),
      ref: z.string().optional().describe('Branch or tag to use for context during validation')
    })
  )
  .output(
    z.object({
      valid: z.boolean(),
      errors: z.array(z.string()),
      warnings: z.array(z.string()),
      mergedYaml: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let result = (await client.lintCiConfig(projectId, ctx.input.content, {
      dry_run: ctx.input.dryRun,
      include_merged_yaml: ctx.input.includeMergedYaml,
      ref: ctx.input.ref
    })) as any;

    return {
      output: {
        valid: result.valid,
        errors: result.errors || [],
        warnings: result.warnings || [],
        mergedYaml: result.merged_yaml
      },
      message: result.valid
        ? 'CI configuration is **valid**.'
        : `CI configuration is **invalid** with **${(result.errors || []).length}** error(s).`
    };
  })
  .build();
