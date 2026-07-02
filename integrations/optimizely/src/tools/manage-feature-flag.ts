import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlagsClient } from '../lib/client';
import { spec } from '../spec';

export let manageFeatureFlag = SlateTool.create(spec, {
  name: 'Manage Feature Flag',
  key: 'manage_feature_flag',
  description: `Create, update, retrieve, delete, enable, or disable feature flags in Optimizely Feature Experimentation.
Use this to manage feature flag lifecycle including toggling flags on/off per environment and configuring rulesets.`,
  instructions: [
    'Use "enable" or "disable" actions to toggle a flag in a specific environment.',
    'Use "get_ruleset" to inspect the current ruleset for a flag in an environment.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'update',
          'get',
          'delete',
          'list',
          'enable',
          'disable',
          'get_ruleset',
          'update_ruleset'
        ])
        .describe('Action to perform'),
      projectId: z.number().describe('Project ID'),
      flagKey: z
        .string()
        .optional()
        .describe(
          'Flag key (required for get, update, delete, enable, disable, get_ruleset, update_ruleset)'
        ),
      environmentKey: z
        .string()
        .optional()
        .describe(
          'Environment key (required for enable, disable, get_ruleset, update_ruleset)'
        ),
      name: z.string().optional().describe('Flag name (for create/update)'),
      description: z.string().optional().describe('Flag description (for create/update)'),
      key: z.string().optional().describe('Flag key identifier (for create)'),
      archived: z.boolean().optional().describe('Whether to archive the flag (for update)'),
      rulesetData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Ruleset configuration data (for update_ruleset)')
    })
  )
  .output(
    z.object({
      flag: z.any().optional().describe('Feature flag data'),
      flags: z.array(z.any()).optional().describe('List of feature flags'),
      ruleset: z.any().optional().describe('Ruleset data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlagsClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'list': {
        let flags = await client.listFlags(ctx.input.projectId);
        return {
          output: { flags: Array.isArray(flags) ? flags : flags.items || [] },
          message: `Listed feature flags in project ${ctx.input.projectId}.`
        };
      }
      case 'get': {
        if (!ctx.input.flagKey) throw new Error('flagKey is required');
        let flag = await client.getFlag(ctx.input.projectId, ctx.input.flagKey);
        return {
          output: { flag },
          message: `Retrieved feature flag **${flag.name || ctx.input.flagKey}**.`
        };
      }
      case 'create': {
        if (!ctx.input.key) throw new Error('key is required for creating a flag');
        if (!ctx.input.name) throw new Error('name is required for creating a flag');
        let flag = await client.createFlag(ctx.input.projectId, {
          key: ctx.input.key,
          name: ctx.input.name,
          description: ctx.input.description
        });
        return {
          output: { flag },
          message: `Created feature flag **${flag.name}** (key: ${flag.key}).`
        };
      }
      case 'update': {
        if (!ctx.input.flagKey) throw new Error('flagKey is required');
        let flag = await client.updateFlag(ctx.input.projectId, ctx.input.flagKey, {
          name: ctx.input.name,
          description: ctx.input.description,
          archived: ctx.input.archived
        });
        return {
          output: { flag },
          message: `Updated feature flag **${flag.name || ctx.input.flagKey}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.flagKey) throw new Error('flagKey is required');
        await client.deleteFlag(ctx.input.projectId, ctx.input.flagKey);
        return {
          output: {},
          message: `Deleted feature flag **${ctx.input.flagKey}**.`
        };
      }
      case 'enable': {
        if (!ctx.input.flagKey) throw new Error('flagKey is required');
        if (!ctx.input.environmentKey) throw new Error('environmentKey is required');
        let ruleset = await client.enableFlag(
          ctx.input.projectId,
          ctx.input.flagKey,
          ctx.input.environmentKey
        );
        return {
          output: { ruleset },
          message: `Enabled flag **${ctx.input.flagKey}** in environment **${ctx.input.environmentKey}**.`
        };
      }
      case 'disable': {
        if (!ctx.input.flagKey) throw new Error('flagKey is required');
        if (!ctx.input.environmentKey) throw new Error('environmentKey is required');
        let ruleset = await client.disableFlag(
          ctx.input.projectId,
          ctx.input.flagKey,
          ctx.input.environmentKey
        );
        return {
          output: { ruleset },
          message: `Disabled flag **${ctx.input.flagKey}** in environment **${ctx.input.environmentKey}**.`
        };
      }
      case 'get_ruleset': {
        if (!ctx.input.flagKey) throw new Error('flagKey is required');
        if (!ctx.input.environmentKey) throw new Error('environmentKey is required');
        let ruleset = await client.listRulesets(
          ctx.input.projectId,
          ctx.input.flagKey,
          ctx.input.environmentKey
        );
        return {
          output: { ruleset },
          message: `Retrieved ruleset for flag **${ctx.input.flagKey}** in environment **${ctx.input.environmentKey}**.`
        };
      }
      case 'update_ruleset': {
        if (!ctx.input.flagKey) throw new Error('flagKey is required');
        if (!ctx.input.environmentKey) throw new Error('environmentKey is required');
        if (!ctx.input.rulesetData) throw new Error('rulesetData is required');
        let ruleset = await client.updateRuleset(
          ctx.input.projectId,
          ctx.input.flagKey,
          ctx.input.environmentKey,
          ctx.input.rulesetData
        );
        return {
          output: { ruleset },
          message: `Updated ruleset for flag **${ctx.input.flagKey}** in environment **${ctx.input.environmentKey}**.`
        };
      }
    }
  })
  .build();
