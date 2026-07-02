import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

let functionEventSchema = z.object({
  eventType: z
    .enum(['created', 'updated', 'deleted', 'state_changed'])
    .describe('Type of change detected'),
  functionName: z.string().describe('Fully qualified function resource name'),
  shortName: z.string().describe('Short function name'),
  state: z.string().describe('Current function state'),
  updateTime: z.string().describe('Timestamp of the change'),
  previousState: z.string().optional().describe('Previous state if changed')
});

export let functionChanges = SlateTrigger.create(spec, {
  name: 'Function Changes',
  key: 'function_changes',
  description:
    'Detects changes to Cloud Functions in a project, including new functions, updates, deletions, and state changes.'
})
  .scopes(googleCloudFunctionsActionScopes.functionChanges)
  .input(functionEventSchema)
  .output(
    z.object({
      functionName: z.string().describe('Fully qualified function resource name'),
      shortName: z.string().describe('Short function name'),
      state: z.string().describe('Current function state'),
      runtime: z.string().optional().describe('Runtime environment'),
      url: z.string().optional().describe('Deployed HTTP URL'),
      environment: z.string().optional().describe('GEN_1 or GEN_2'),
      updateTime: z.string().optional().describe('Last update timestamp'),
      description: z.string().optional().describe('Function description'),
      labels: z.record(z.string(), z.string()).optional().describe('Function labels')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        projectId: ctx.config.projectId,
        region: ctx.config.region
      });

      let response = await client.listFunctions({ allLocations: true, pageSize: 1000 });
      let currentFunctions: Record<string, any> = {};

      for (let fn of response.functions || []) {
        currentFunctions[fn.name] = {
          state: fn.state,
          updateTime: fn.updateTime,
          runtime: fn.buildConfig?.runtime,
          url: fn.url || fn.serviceConfig?.uri,
          environment: fn.environment,
          description: fn.description,
          labels: fn.labels
        };
      }

      let previousState: Record<string, any> = ctx.state || {};
      let previousFunctions: Record<string, any> = previousState.functions || {};
      let inputs: z.infer<typeof functionEventSchema>[] = [];

      for (let [name, data] of Object.entries(currentFunctions)) {
        let nameParts = name.split('/');
        let shortName = nameParts[nameParts.length - 1] || name;

        if (!previousFunctions[name]) {
          inputs.push({
            eventType: 'created',
            functionName: name,
            shortName,
            state: data.state || 'UNKNOWN',
            updateTime: data.updateTime || new Date().toISOString()
          });
        } else {
          let prev = previousFunctions[name];
          if (data.updateTime !== prev.updateTime) {
            if (data.state !== prev.state) {
              inputs.push({
                eventType: 'state_changed',
                functionName: name,
                shortName,
                state: data.state || 'UNKNOWN',
                updateTime: data.updateTime || new Date().toISOString(),
                previousState: prev.state
              });
            } else {
              inputs.push({
                eventType: 'updated',
                functionName: name,
                shortName,
                state: data.state || 'UNKNOWN',
                updateTime: data.updateTime || new Date().toISOString()
              });
            }
          }
        }
      }

      for (let [name] of Object.entries(previousFunctions)) {
        if (!currentFunctions[name]) {
          let nameParts = name.split('/');
          let shortName = nameParts[nameParts.length - 1] || name;

          inputs.push({
            eventType: 'deleted',
            functionName: name,
            shortName,
            state: 'DELETED',
            updateTime: new Date().toISOString()
          });
        }
      }

      return {
        inputs,
        updatedState: {
          functions: currentFunctions
        }
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        projectId: ctx.config.projectId,
        region: ctx.config.region
      });

      let functionData: any = {};

      if (ctx.input.eventType !== 'deleted') {
        try {
          functionData = await client.getFunction(ctx.input.functionName);
        } catch {
          // Function may have been deleted between polling and event handling
        }
      }

      let nameParts = ctx.input.functionName.split('/');
      let shortName = nameParts[nameParts.length - 1] || ctx.input.functionName;

      return {
        type: `function.${ctx.input.eventType}`,
        id: `${ctx.input.functionName}-${ctx.input.updateTime}`,
        output: {
          functionName: ctx.input.functionName,
          shortName,
          state: ctx.input.state,
          runtime: functionData?.buildConfig?.runtime,
          url: functionData?.url || functionData?.serviceConfig?.uri,
          environment: functionData?.environment,
          updateTime: ctx.input.updateTime,
          description: functionData?.description,
          labels: functionData?.labels
        }
      };
    }
  })
  .build();
