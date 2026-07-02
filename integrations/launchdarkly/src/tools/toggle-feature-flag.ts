import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let toggleFeatureFlag = SlateTool.create(spec, {
  name: 'Toggle Feature Flag',
  key: 'toggle_feature_flag',
  description: `Quickly turn a feature flag on or off in a specific environment. This is a convenience tool for the most common flag operation — no need to construct semantic patch instructions manually.`
})
  .input(
    z.object({
      projectKey: z
        .string()
        .optional()
        .describe('Project key. Falls back to config default if not provided.'),
      flagKey: z.string().describe('Key of the flag to toggle'),
      environmentKey: z
        .string()
        .optional()
        .describe('Environment key. Falls back to config default.'),
      enabled: z.boolean().describe('Set to true to turn the flag on, false to turn it off')
    })
  )
  .output(
    z.object({
      flagKey: z.string().describe('Flag key'),
      name: z.string().describe('Flag name'),
      on: z.boolean().describe('Whether the flag is now on in the environment')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey ?? ctx.config.projectKey;
    if (!projectKey) {
      throw new Error(
        'projectKey is required. Provide it in the input or set a default in config.'
      );
    }

    let envKey = ctx.input.environmentKey ?? ctx.config.environmentKey;
    if (!envKey) {
      throw new Error(
        'environmentKey is required. Provide it in the input or set a default in config.'
      );
    }

    let client = new LaunchDarklyClient(ctx.auth.token);
    let instruction = ctx.input.enabled
      ? { kind: 'turnFlagOn', environmentKey: envKey }
      : { kind: 'turnFlagOff', environmentKey: envKey };

    let flag = await client.updateFeatureFlag(projectKey, ctx.input.flagKey, [instruction]);
    let envConfig = flag.environments?.[envKey];

    return {
      output: {
        flagKey: flag.key,
        name: flag.name,
        on: envConfig?.on ?? ctx.input.enabled
      },
      message: `Turned **${ctx.input.enabled ? 'ON' : 'OFF'}** flag **${flag.name}** (\`${flag.key}\`) in environment \`${envKey}\`.`
    };
  })
  .build();
