import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let lintTravisYml = SlateTool.create(spec, {
  name: 'Lint Travis CI Config',
  key: 'lint_travis_yml',
  description: `Validate a .travis.yml configuration file for syntax errors and warnings. Provide the full YAML content and receive a list of warnings if any issues are found.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('Full content of the .travis.yml file to validate.')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the config is valid (no warnings)'),
      warnings: z
        .array(
          z.object({
            key: z
              .array(z.string())
              .optional()
              .describe('Config key path associated with the warning'),
            message: z.string().describe('Warning message')
          })
        )
        .describe('List of warnings found in the configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.lintTravisYml(ctx.input.content);

    let warnings = (result.warnings || []).map((w: any) => ({
      key: w.key,
      message: w.message
    }));

    return {
      output: {
        valid: warnings.length === 0,
        warnings
      },
      message:
        warnings.length === 0
          ? 'Travis CI config is **valid** with no warnings.'
          : `Found **${warnings.length}** warning(s) in the Travis CI config.`
    };
  })
  .build();
