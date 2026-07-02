import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { requireHuggingFaceInput } from '../lib/errors';
import { spec } from '../spec';

export let getSpaceRuntimeTool = SlateTool.create(spec, {
  name: 'Get Space Runtime',
  key: 'get_space_runtime',
  description: `Get runtime information for a Space, including hardware, stage, SDK, and storage details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoId: z.string().describe('Full Space ID (e.g. "username/space-name")')
    })
  )
  .output(
    z.object({
      stage: z
        .string()
        .optional()
        .describe('Runtime stage (e.g. "RUNNING", "BUILDING", "PAUSED")'),
      hardware: z.string().optional().describe('Current hardware flavor'),
      sdk: z.string().optional().describe('SDK used'),
      storage: z.string().optional().describe('Storage tier'),
      gcTimeout: z.number().optional().describe('Garbage collection timeout in seconds'),
      devMode: z.boolean().optional().describe('Whether dev mode is enabled'),
      raw: z.any().optional().describe('Full runtime info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });
    let runtime = await client.getSpaceRuntime({ repoId: ctx.input.repoId });

    return {
      output: {
        stage: runtime.stage,
        hardware: runtime.hardware?.current || runtime.hardware,
        sdk: runtime.sdk,
        storage: runtime.storage,
        gcTimeout: runtime.gcTimeout,
        devMode: runtime.devMode,
        raw: runtime
      },
      message: `Space **${ctx.input.repoId}** is in stage **${runtime.stage || 'unknown'}** on hardware **${runtime.hardware?.current || runtime.hardware || 'cpu-basic'}**.`
    };
  })
  .build();

export let controlSpaceTool = SlateTool.create(spec, {
  name: 'Control Space',
  key: 'control_space',
  description: `Control a Space's lifecycle: pause, restart, or change hardware. Use this to manage running Spaces.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoId: z.string().describe('Full Space ID (e.g. "username/space-name")'),
      action: z.enum(['pause', 'restart', 'set_hardware']).describe('Action to perform'),
      hardware: z
        .string()
        .optional()
        .describe(
          'Hardware flavor when using set_hardware (e.g. "cpu-basic", "t4-small", "a10g-small")'
        )
    })
  )
  .output(
    z.object({
      repoId: z.string().describe('Space ID'),
      action: z.string().describe('Action performed'),
      stage: z.string().optional().describe('New stage after action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'pause') {
      result = await client.pauseSpace({ repoId: ctx.input.repoId });
    } else if (ctx.input.action === 'restart') {
      result = await client.restartSpace({ repoId: ctx.input.repoId });
    } else if (ctx.input.action === 'set_hardware') {
      let hardware = requireHuggingFaceInput(
        ctx.input.hardware,
        'Hardware flavor',
        'set_hardware'
      );
      result = await client.setSpaceHardware({
        repoId: ctx.input.repoId,
        hardware
      });
    }

    return {
      output: {
        repoId: ctx.input.repoId,
        action: ctx.input.action,
        stage: result?.stage
      },
      message: `Performed **${ctx.input.action}** on Space **${ctx.input.repoId}**.`
    };
  })
  .build();

export let manageSpaceSecretsTool = SlateTool.create(spec, {
  name: 'Manage Space Secrets',
  key: 'manage_space_secrets',
  description: `List, add, or delete secrets on a Space. Secrets are encrypted environment variables available at runtime.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoId: z.string().describe('Full Space ID (e.g. "username/space-name")'),
      action: z
        .enum(['list', 'add', 'delete'])
        .describe('Whether to list, add, or delete a secret'),
      key: z.string().optional().describe('Secret key name (required for add/delete)'),
      value: z.string().optional().describe('Secret value (required when adding)'),
      description: z.string().optional().describe('Optional description when adding a secret')
    })
  )
  .output(
    z.object({
      repoId: z.string().describe('Space ID'),
      action: z.string().describe('Action performed'),
      key: z.string().optional().describe('Secret key'),
      secrets: z
        .array(
          z.object({
            key: z.string().optional().describe('Secret key'),
            updatedAt: z.string().optional().describe('Last update timestamp'),
            description: z.string().optional().describe('Secret description')
          })
        )
        .optional()
        .describe('Secrets returned for list action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let secrets = await client.listSpaceSecrets({ repoId: ctx.input.repoId });
      return {
        output: {
          repoId: ctx.input.repoId,
          action: ctx.input.action,
          secrets: (secrets || []).map((secret: any) => ({
            key: secret.key || secret.name,
            updatedAt: secret.updatedAt,
            description: secret.description
          }))
        },
        message: `Found **${secrets?.length || 0}** secret(s) on Space **${ctx.input.repoId}**.`
      };
    }

    if (ctx.input.action === 'add') {
      let key = requireHuggingFaceInput(ctx.input.key, 'Secret key', 'add secret');
      let value = requireHuggingFaceInput(ctx.input.value, 'Value', 'add secret');
      await client.addSpaceSecret({
        repoId: ctx.input.repoId,
        key,
        value,
        description: ctx.input.description
      });
    } else {
      let key = requireHuggingFaceInput(ctx.input.key, 'Secret key', 'delete secret');
      await client.deleteSpaceSecret({
        repoId: ctx.input.repoId,
        key
      });
    }

    return {
      output: {
        repoId: ctx.input.repoId,
        action: ctx.input.action,
        key: ctx.input.key
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Deleted'} secret **${ctx.input.key}** on Space **${ctx.input.repoId}**.`
    };
  })
  .build();

export let manageSpaceVariablesTool = SlateTool.create(spec, {
  name: 'Manage Space Variables',
  key: 'manage_space_variables',
  description: `List, add, or delete environment variables on a Space. Variables are public configuration values available at runtime.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoId: z.string().describe('Full Space ID (e.g. "username/space-name")'),
      action: z
        .enum(['list', 'add', 'delete'])
        .describe('Whether to list, add, or delete a variable'),
      key: z.string().optional().describe('Variable key name (required for add/delete)'),
      value: z.string().optional().describe('Variable value (required when adding)'),
      description: z
        .string()
        .optional()
        .describe('Optional description when adding a variable')
    })
  )
  .output(
    z.object({
      repoId: z.string().describe('Space ID'),
      action: z.string().describe('Action performed'),
      key: z.string().optional().describe('Variable key'),
      variables: z
        .array(
          z.object({
            key: z.string().optional().describe('Variable key'),
            value: z.string().optional().describe('Variable value'),
            updatedAt: z.string().optional().describe('Last update timestamp'),
            description: z.string().optional().describe('Variable description')
          })
        )
        .optional()
        .describe('Variables returned for list action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let variables = await client.listSpaceVariables({ repoId: ctx.input.repoId });
      return {
        output: {
          repoId: ctx.input.repoId,
          action: ctx.input.action,
          variables: (variables || []).map((variable: any) => ({
            key: variable.key || variable.name,
            value: variable.value,
            updatedAt: variable.updatedAt,
            description: variable.description
          }))
        },
        message: `Found **${variables?.length || 0}** variable(s) on Space **${ctx.input.repoId}**.`
      };
    }

    if (ctx.input.action === 'add') {
      let key = requireHuggingFaceInput(ctx.input.key, 'Variable key', 'add variable');
      let value = requireHuggingFaceInput(ctx.input.value, 'Value', 'add variable');
      await client.addSpaceVariable({
        repoId: ctx.input.repoId,
        key,
        value,
        description: ctx.input.description
      });
    } else {
      let key = requireHuggingFaceInput(ctx.input.key, 'Variable key', 'delete variable');
      await client.deleteSpaceVariable({
        repoId: ctx.input.repoId,
        key
      });
    }

    return {
      output: {
        repoId: ctx.input.repoId,
        action: ctx.input.action,
        key: ctx.input.key
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Deleted'} variable **${ctx.input.key}** on Space **${ctx.input.repoId}**.`
    };
  })
  .build();
