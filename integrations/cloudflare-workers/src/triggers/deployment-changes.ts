import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let deploymentVersionSchema = z.object({
  versionId: z.string().describe('Deployed version UUID'),
  percentage: z.number().describe('Traffic percentage')
});

export let deploymentChanges = SlateTrigger.create(spec, {
  name: 'Worker Deployment Changes',
  key: 'deployment_changes',
  description:
    'Detects when new deployments are created for a specific Worker script, including gradual rollouts and full deployments.'
})
  .input(
    z.object({
      scriptName: z.string().describe('Worker script name'),
      deploymentId: z.string().describe('Deployment UUID'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      source: z.string().optional().describe('Source of deployment'),
      authorEmail: z.string().optional().describe('Author email'),
      strategy: z.string().optional().describe('Deployment strategy'),
      versions: z.array(z.record(z.string(), z.any())).optional().describe('Raw version data')
    })
  )
  .output(
    z.object({
      scriptName: z.string().describe('Worker script name'),
      deploymentId: z.string().describe('Deployment UUID'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      source: z.string().optional().describe('Source of deployment'),
      authorEmail: z.string().optional().describe('Author email'),
      strategy: z.string().optional().describe('Deployment strategy'),
      versions: z
        .array(deploymentVersionSchema)
        .optional()
        .describe('Deployed versions with traffic split')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      // Get all scripts first, then check deployments for each
      let scripts = await client.listScripts();
      let scriptList: any[] = scripts || [];

      let previousDeployments: Record<string, string> = ctx.state?.knownDeployments || {};
      let currentDeployments: Record<string, string> = {};
      let inputs: any[] = [];
      let isFirstRun = Object.keys(previousDeployments).length === 0;

      for (let script of scriptList) {
        let scriptName = script.id;
        try {
          let result = await client.listDeployments(scriptName);
          let deployments = result?.deployments || result || [];

          if (deployments.length > 0) {
            let latest = deployments[0]; // First is the latest active deployment
            let key = `${scriptName}:${latest.id}`;
            currentDeployments[key] = latest.id;

            if (!isFirstRun && !previousDeployments[key]) {
              inputs.push({
                scriptName,
                deploymentId: latest.id,
                createdOn: latest.created_on,
                source: latest.source,
                authorEmail: latest.author_email,
                strategy: latest.strategy,
                versions: latest.versions
              });
            }
          }
        } catch {
          // Skip scripts that error (e.g., no deployments yet)
        }
      }

      return {
        inputs,
        updatedState: {
          knownDeployments: currentDeployments
        }
      };
    },

    handleEvent: async ctx => {
      let versions = (ctx.input.versions || []).map((v: any) => ({
        versionId: v.version_id,
        percentage: v.percentage
      }));

      return {
        type: 'worker_deployment.created',
        id: ctx.input.deploymentId,
        output: {
          scriptName: ctx.input.scriptName,
          deploymentId: ctx.input.deploymentId,
          createdOn: ctx.input.createdOn,
          source: ctx.input.source,
          authorEmail: ctx.input.authorEmail,
          strategy: ctx.input.strategy,
          versions
        }
      };
    }
  })
  .build();
