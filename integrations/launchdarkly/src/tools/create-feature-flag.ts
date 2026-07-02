import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let createFeatureFlag = SlateTool.create(spec, {
  name: 'Create Feature Flag',
  key: 'create_feature_flag',
  description: `Create a new feature flag in a LaunchDarkly project. The flag will be created in every environment within the project. By default creates a boolean flag; provide custom variations for multivariate flags.`,
  instructions: [
    'For a boolean flag, you can omit variations and defaults — LaunchDarkly will create true/false variations automatically.',
    'For a multivariate flag, provide variations with their values, and optionally set defaults for on/off variation indices.'
  ]
})
  .input(
    z.object({
      projectKey: z
        .string()
        .optional()
        .describe('Project key. Falls back to config default if not provided.'),
      flagKey: z.string().describe('Unique key for the flag (used in code)'),
      name: z.string().describe('Human-readable name for the flag'),
      description: z.string().optional().describe('Description of the flag'),
      tags: z.array(z.string()).optional().describe('Tags to associate with the flag'),
      temporary: z
        .boolean()
        .optional()
        .describe('Whether this is a temporary flag (default false)'),
      variations: z
        .array(
          z.object({
            value: z.any().describe('Variation value (boolean, string, number, or JSON)'),
            name: z.string().optional().describe('Variation name'),
            description: z.string().optional().describe('Variation description')
          })
        )
        .optional()
        .describe('Custom variations. Omit for default boolean true/false.'),
      defaults: z
        .object({
          onVariation: z
            .number()
            .describe('Index of the variation to serve when targeting is on'),
          offVariation: z
            .number()
            .describe('Index of the variation to serve when the flag is off')
        })
        .optional()
        .describe('Default on/off variation indices'),
      clientSideAvailability: z
        .object({
          usingMobileKey: z
            .boolean()
            .optional()
            .describe('Make flag available to mobile SDKs'),
          usingEnvironmentId: z
            .boolean()
            .optional()
            .describe('Make flag available to client-side SDKs')
        })
        .optional()
        .describe('Client-side SDK availability settings')
    })
  )
  .output(
    z.object({
      flagKey: z.string().describe('Created flag key'),
      name: z.string().describe('Created flag name'),
      kind: z.string().describe('Flag kind'),
      variationCount: z.number().describe('Number of variations'),
      creationDate: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey ?? ctx.config.projectKey;
    if (!projectKey) {
      throw new Error(
        'projectKey is required. Provide it in the input or set a default in config.'
      );
    }

    let client = new LaunchDarklyClient(ctx.auth.token);
    let flag = await client.createFeatureFlag(projectKey, {
      key: ctx.input.flagKey,
      name: ctx.input.name,
      description: ctx.input.description,
      tags: ctx.input.tags,
      temporary: ctx.input.temporary,
      variations: ctx.input.variations,
      defaults: ctx.input.defaults,
      clientSideAvailability: ctx.input.clientSideAvailability
    });

    return {
      output: {
        flagKey: flag.key,
        name: flag.name,
        kind: flag.kind,
        variationCount: (flag.variations ?? []).length,
        creationDate: String(flag.creationDate)
      },
      message: `Created feature flag **${flag.name}** (\`${flag.key}\`) in project \`${projectKey}\`.`
    };
  })
  .build();
