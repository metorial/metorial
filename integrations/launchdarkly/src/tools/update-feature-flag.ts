import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let updateFeatureFlag = SlateTool.create(spec, {
  name: 'Update Feature Flag',
  key: 'update_feature_flag',
  description: `Update a feature flag's configuration using LaunchDarkly's semantic patch. Supports toggling on/off, updating name/description/tags, changing fallthrough variations, adding/removing targeting rules, and setting individual targets. All changes are environment-specific unless they modify flag-level properties.`,
  instructions: [
    'Use turnFlagOn/turnFlagOff to toggle a flag in a specific environment.',
    'Use updateFallthroughVariationOrRollout to change the default variation served when the flag is on.',
    'Use addTargets/removeTargets to target specific context keys.',
    'Use addRule to add a targeting rule with clauses.',
    'Multiple instructions can be combined in a single update for atomic changes.'
  ],
  constraints: [
    'The environmentKey is required for environment-specific changes (toggling, targeting, rules).'
  ]
})
  .input(
    z.object({
      projectKey: z
        .string()
        .optional()
        .describe('Project key. Falls back to config default if not provided.'),
      flagKey: z.string().describe('Key of the flag to update'),
      environmentKey: z
        .string()
        .optional()
        .describe(
          'Environment key (required for targeting/toggle changes). Falls back to config default.'
        ),
      instructions: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of semantic patch instructions. Each instruction is an object with a "kind" field and kind-specific parameters. Common kinds: "turnFlagOn", "turnFlagOff", "updateName", "updateDescription", "addTags", "removeTags", "updateFallthroughVariationOrRollout", "addTargets", "removeTargets", "addRule", "removeRule", "addPrerequisite", "removePrerequisite".'
        )
    })
  )
  .output(
    z.object({
      flagKey: z.string().describe('Updated flag key'),
      name: z.string().describe('Updated flag name'),
      on: z.boolean().optional().describe('Whether the flag is on in the environment')
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
    let instructions = ctx.input.instructions.map(instruction => {
      if (envKey && !instruction.environmentKey) {
        return { ...instruction, environmentKey: envKey };
      }
      return instruction;
    });

    let client = new LaunchDarklyClient(ctx.auth.token);
    let flag = await client.updateFeatureFlag(projectKey, ctx.input.flagKey, instructions);

    let envConfig = envKey ? flag.environments?.[envKey] : undefined;

    return {
      output: {
        flagKey: flag.key,
        name: flag.name,
        on: envConfig?.on
      },
      message: `Updated flag **${flag.name}** (\`${flag.key}\`)${envConfig ? ` — now ${envConfig.on ? 'ON' : 'OFF'} in \`${envKey}\`` : ''}.`
    };
  })
  .build();
