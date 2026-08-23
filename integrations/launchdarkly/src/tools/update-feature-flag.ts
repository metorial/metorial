import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { launchDarklyServiceError } from '../lib/errors';
import { requireProjectKey } from '../lib/inputs';
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
        .min(1)
        .describe(
          'Array of semantic patch instructions. Each instruction is an object with a "kind" field and kind-specific parameters. Common kinds: "turnFlagOn", "turnFlagOff", "updateName", "updateDescription", "addTags", "removeTags", "updateFallthroughVariationOrRollout", "addTargets", "removeTargets", "addRule", "removeRule", "addPrerequisite", "removePrerequisite".'
        ),
      comment: z
        .string()
        .optional()
        .describe('Optional comment recorded in LaunchDarkly change history')
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
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);

    for (let [index, instruction] of ctx.input.instructions.entries()) {
      if (typeof instruction.kind !== 'string' || instruction.kind.length === 0) {
        throw launchDarklyServiceError(
          `instructions[${index}].kind is required.`,
          'launchdarkly_patch_instruction_kind_required'
        );
      }
    }

    let envKey = ctx.input.environmentKey ?? ctx.config.environmentKey;
    let embeddedEnvironmentKeys = [
      ...new Set(
        ctx.input.instructions
          .map(instruction => instruction.environmentKey)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    ];

    if (embeddedEnvironmentKeys.length > 1) {
      throw launchDarklyServiceError(
        'A semantic patch can target only one environment. Provide one environmentKey for the tool call.',
        'launchdarkly_multiple_patch_environments'
      );
    }
    if (envKey && embeddedEnvironmentKeys[0] && envKey !== embeddedEnvironmentKeys[0]) {
      throw launchDarklyServiceError(
        'environmentKey conflicts with an environmentKey embedded in an instruction. Use the top-level tool field.',
        'launchdarkly_patch_environment_conflict'
      );
    }
    envKey ??= embeddedEnvironmentKeys[0];

    let instructions = ctx.input.instructions.map(instruction => {
      if ('environmentKey' in instruction) {
        let { environmentKey: _legacyEnvironmentKey, ...rest } = instruction;
        return rest;
      }
      return instruction;
    });

    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let flag = await client.updateFeatureFlag(projectKey, ctx.input.flagKey, instructions, {
      environmentKey: envKey,
      comment: ctx.input.comment
    });

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
