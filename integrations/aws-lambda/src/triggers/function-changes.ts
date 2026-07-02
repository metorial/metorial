import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let functionChanges = SlateTrigger.create(spec, {
  name: 'Function Changes',
  key: 'function_changes',
  description:
    'Polls for new, updated, or deleted Lambda functions by comparing snapshots of the function list. Detects when functions are created, modified (code or configuration changes), or removed.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      functionName: z.string().describe('Name of the affected function'),
      functionArn: z.string().describe('ARN of the affected function'),
      runtime: z.string().optional().describe('Function runtime'),
      lastModified: z.string().optional().describe('Last modified timestamp'),
      state: z.string().optional().describe('Function state'),
      codeSha256: z.string().optional().describe('SHA256 of the deployment package'),
      version: z.string().optional().describe('Function version')
    })
  )
  .output(
    z.object({
      functionName: z.string().describe('Name of the affected function'),
      functionArn: z.string().describe('ARN of the affected function'),
      runtime: z.string().optional().describe('Function runtime'),
      lastModified: z.string().optional().describe('Last modified timestamp'),
      state: z.string().optional().describe('Function state'),
      codeSha256: z.string().optional().describe('SHA256 of the deployment package'),
      version: z.string().optional().describe('Function version')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let allFunctions: any[] = [];
      let marker: string | undefined;
      do {
        let result = await client.listFunctions(marker, 50);
        allFunctions.push(...(result.Functions || []));
        marker = result.NextMarker;
      } while (marker);

      let currentMap: Record<string, any> = {};
      for (let fn of allFunctions) {
        currentMap[fn.FunctionArn] = {
          functionName: fn.FunctionName,
          functionArn: fn.FunctionArn,
          runtime: fn.Runtime,
          lastModified: fn.LastModified,
          state: fn.State,
          codeSha256: fn.CodeSha256,
          version: fn.Version
        };
      }

      let previousMap: Record<string, any> = ctx.state?.functionMap || {};
      let inputs: any[] = [];

      // Detect new and updated functions
      for (let [arn, current] of Object.entries(currentMap)) {
        let previous = previousMap[arn];
        if (!previous) {
          inputs.push({ changeType: 'created' as const, ...current });
        } else if (
          previous.lastModified !== current.lastModified ||
          previous.codeSha256 !== current.codeSha256
        ) {
          inputs.push({ changeType: 'updated' as const, ...current });
        }
      }

      // Detect deleted functions
      for (let [arn, previous] of Object.entries(previousMap)) {
        if (!currentMap[arn]) {
          inputs.push({ changeType: 'deleted' as const, ...previous });
        }
      }

      return {
        inputs,
        updatedState: {
          functionMap: currentMap
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `function.${ctx.input.changeType}`,
        id: `${ctx.input.functionArn}-${ctx.input.changeType}-${ctx.input.lastModified || Date.now()}`,
        output: {
          functionName: ctx.input.functionName,
          functionArn: ctx.input.functionArn,
          runtime: ctx.input.runtime,
          lastModified: ctx.input.lastModified,
          state: ctx.input.state,
          codeSha256: ctx.input.codeSha256,
          version: ctx.input.version
        }
      };
    }
  })
  .build();
