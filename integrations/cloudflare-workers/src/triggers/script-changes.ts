import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let scriptChanges = SlateTrigger.create(spec, {
  name: 'Worker Script Changes',
  key: 'script_changes',
  description: 'Detects when Worker scripts are created, updated, or deleted in the account.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'deleted']).describe('Type of change detected'),
      scriptName: z.string().describe('Name of the affected Worker script'),
      modifiedOn: z.string().optional().describe('ISO 8601 timestamp of the change'),
      scriptMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Script metadata at time of detection')
    })
  )
  .output(
    z.object({
      scriptName: z.string().describe('Name of the affected Worker script'),
      modifiedOn: z.string().optional().describe('ISO 8601 timestamp of the change'),
      handlers: z
        .array(z.string())
        .optional()
        .describe('Event handlers defined on the script'),
      compatibilityDate: z.string().optional().describe('Compatibility date'),
      lastDeployedFrom: z.string().optional().describe('Source of last deployment'),
      usageModel: z.string().optional().describe('Usage model')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let scripts = await client.listScripts();
      let scriptList: any[] = scripts || [];

      let previousScripts: Record<string, string> = ctx.state?.knownScripts || {};

      let currentScripts: Record<string, string> = {};
      let inputs: Array<{
        eventType: 'created' | 'updated' | 'deleted';
        scriptName: string;
        modifiedOn?: string;
        scriptMetadata?: Record<string, any>;
      }> = [];

      for (let script of scriptList) {
        let name = script.id;
        let modifiedOn = script.modified_on || '';
        currentScripts[name] = modifiedOn;

        if (!previousScripts[name]) {
          // Only emit created if we have a prior state (not first run)
          if (Object.keys(previousScripts).length > 0) {
            inputs.push({
              eventType: 'created',
              scriptName: name,
              modifiedOn,
              scriptMetadata: script
            });
          }
        } else if (previousScripts[name] !== modifiedOn) {
          inputs.push({
            eventType: 'updated',
            scriptName: name,
            modifiedOn,
            scriptMetadata: script
          });
        }
      }

      // Detect deleted scripts (only if we have prior state)
      if (Object.keys(previousScripts).length > 0) {
        for (let name of Object.keys(previousScripts)) {
          if (!currentScripts[name]) {
            inputs.push({
              eventType: 'deleted',
              scriptName: name,
              modifiedOn: new Date().toISOString()
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownScripts: currentScripts
        }
      };
    },

    handleEvent: async ctx => {
      let meta = ctx.input.scriptMetadata || {};
      return {
        type: `worker_script.${ctx.input.eventType}`,
        id: `${ctx.input.scriptName}-${ctx.input.eventType}-${ctx.input.modifiedOn || Date.now()}`,
        output: {
          scriptName: ctx.input.scriptName,
          modifiedOn: ctx.input.modifiedOn,
          handlers: meta.handlers as string[] | undefined,
          compatibilityDate: meta.compatibility_date as string | undefined,
          lastDeployedFrom: meta.last_deployed_from as string | undefined,
          usageModel: meta.usage_model as string | undefined
        }
      };
    }
  })
  .build();
