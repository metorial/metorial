import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
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
      if (!ctx.input.hardware) {
        throw new Error('Hardware flavor is required for set_hardware action');
      }
      result = await client.setSpaceHardware({
        repoId: ctx.input.repoId,
        hardware: ctx.input.hardware
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
  description: `Add or delete secrets on a Space. Secrets are encrypted environment variables available at runtime.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoId: z.string().describe('Full Space ID (e.g. "username/space-name")'),
      action: z.enum(['add', 'delete']).describe('Whether to add or delete a secret'),
      key: z.string().describe('Secret key name'),
      value: z.string().optional().describe('Secret value (required when adding)')
    })
  )
  .output(
    z.object({
      repoId: z.string().describe('Space ID'),
      action: z.string().describe('Action performed'),
      key: z.string().describe('Secret key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      if (!ctx.input.value) {
        throw new Error('Value is required when adding a secret');
      }
      await client.addSpaceSecret({
        repoId: ctx.input.repoId,
        key: ctx.input.key,
        value: ctx.input.value
      });
    } else {
      await client.deleteSpaceSecret({
        repoId: ctx.input.repoId,
        key: ctx.input.key
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
  description: `Add or delete environment variables on a Space. Variables are public configuration values available at runtime.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoId: z.string().describe('Full Space ID (e.g. "username/space-name")'),
      action: z.enum(['add', 'delete']).describe('Whether to add or delete a variable'),
      key: z.string().describe('Variable key name'),
      value: z.string().optional().describe('Variable value (required when adding)')
    })
  )
  .output(
    z.object({
      repoId: z.string().describe('Space ID'),
      action: z.string().describe('Action performed'),
      key: z.string().describe('Variable key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      if (!ctx.input.value) {
        throw new Error('Value is required when adding a variable');
      }
      await client.addSpaceVariable({
        repoId: ctx.input.repoId,
        key: ctx.input.key,
        value: ctx.input.value
      });
    } else {
      await client.deleteSpaceVariable({
        repoId: ctx.input.repoId,
        key: ctx.input.key
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
