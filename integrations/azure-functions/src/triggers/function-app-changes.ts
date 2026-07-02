import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import { spec } from '../spec';

export let functionAppChanges = SlateTrigger.create(spec, {
  name: 'Function App Changes',
  key: 'function_app_changes',
  description:
    'Detects changes to function apps and their functions by polling. Monitors for new, updated, or removed function apps and individual functions within them.'
})
  .input(
    z.object({
      changeType: z
        .enum([
          'app_added',
          'app_removed',
          'app_state_changed',
          'function_added',
          'function_removed'
        ])
        .describe('Type of change detected'),
      changeId: z.string().describe('Unique identifier for this change event'),
      appName: z.string().describe('Name of the affected function app'),
      functionName: z
        .string()
        .optional()
        .describe('Name of the affected function (for function-level changes)'),
      previousState: z.string().optional().describe('Previous state value'),
      currentState: z.string().optional().describe('Current state value'),
      appDetails: z.any().optional().describe('Full app or function details')
    })
  )
  .output(
    z.object({
      appName: z.string().describe('Name of the affected function app'),
      functionName: z.string().optional().describe('Name of the affected function'),
      changeType: z.string().describe('Type of change that occurred'),
      previousState: z.string().optional().describe('Previous state value'),
      currentState: z.string().optional().describe('Current state value'),
      defaultHostName: z.string().optional().describe('Default hostname of the function app'),
      location: z.string().optional().describe('Azure region of the function app')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ArmClient({
        token: ctx.auth.token,
        subscriptionId: ctx.config.subscriptionId,
        resourceGroupName: ctx.config.resourceGroupName
      });

      let previousState = ctx.state as {
        apps?: Record<string, { state: string; functions: string[] }>;
      } | null;

      let apps = await client.listFunctionApps();
      let inputs: any[] = [];

      let currentApps: Record<string, { state: string; functions: string[]; details: any }> =
        {};

      for (let app of apps) {
        let appName = app.name;
        let appState = app.properties?.state || 'Unknown';

        let functions: any[] = [];
        try {
          functions = await client.listFunctions(appName);
        } catch {
          // function listing may fail if app is stopped
        }

        let functionNames = functions.map((fn: any) => fn.name?.split('/')?.pop() || fn.name);

        currentApps[appName] = {
          state: appState,
          functions: functionNames,
          details: app
        };

        if (previousState?.apps) {
          let prev = previousState.apps[appName];

          if (!prev) {
            inputs.push({
              changeType: 'app_added' as const,
              changeId: `app_added_${appName}_${Date.now()}`,
              appName,
              currentState: appState,
              appDetails: app
            });
          } else {
            if (prev.state !== appState) {
              inputs.push({
                changeType: 'app_state_changed' as const,
                changeId: `app_state_${appName}_${Date.now()}`,
                appName,
                previousState: prev.state,
                currentState: appState,
                appDetails: app
              });
            }

            let prevFunctions = new Set(prev.functions);
            let currFunctions = new Set(functionNames);

            for (let fn of functionNames) {
              if (!prevFunctions.has(fn)) {
                inputs.push({
                  changeType: 'function_added' as const,
                  changeId: `fn_added_${appName}_${fn}_${Date.now()}`,
                  appName,
                  functionName: fn,
                  appDetails: app
                });
              }
            }

            for (let fn of prev.functions) {
              if (!currFunctions.has(fn)) {
                inputs.push({
                  changeType: 'function_removed' as const,
                  changeId: `fn_removed_${appName}_${fn}_${Date.now()}`,
                  appName,
                  functionName: fn,
                  appDetails: app
                });
              }
            }
          }
        }
      }

      // Check for removed apps
      if (previousState?.apps) {
        for (let prevAppName of Object.keys(previousState.apps)) {
          if (!currentApps[prevAppName]) {
            inputs.push({
              changeType: 'app_removed' as const,
              changeId: `app_removed_${prevAppName}_${Date.now()}`,
              appName: prevAppName,
              previousState: previousState.apps[prevAppName]?.state
            });
          }
        }
      }

      let updatedState: Record<string, { state: string; functions: string[] }> = {};
      for (let [name, data] of Object.entries(currentApps)) {
        updatedState[name] = { state: data.state, functions: data.functions };
      }

      return {
        inputs,
        updatedState: { apps: updatedState }
      };
    },

    handleEvent: async ctx => {
      let {
        changeType,
        changeId,
        appName,
        functionName,
        previousState,
        currentState,
        appDetails
      } = ctx.input;

      return {
        type: `function_app.${changeType}`,
        id: changeId,
        output: {
          appName,
          functionName,
          changeType,
          previousState,
          currentState,
          defaultHostName: appDetails?.properties?.defaultHostName,
          location: appDetails?.location
        }
      };
    }
  })
  .build();
