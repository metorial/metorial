import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let deploymentVersionSchema = z.object({
  versionId: z.string().describe('Version UUID'),
  percentage: z.number().describe('Traffic percentage routed to this version (0-100)')
});

let deploymentSchema = z.object({
  deploymentId: z.string().describe('Deployment UUID'),
  createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
  source: z.string().optional().describe('Source of deployment'),
  strategy: z.string().optional().describe('Deployment strategy'),
  authorEmail: z.string().optional().describe('Author email'),
  versions: z
    .array(deploymentVersionSchema)
    .optional()
    .describe('Versions in this deployment with traffic split')
});

export let listDeployments = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List all deployments for a Worker script. The first deployment in the list is the active one serving traffic. Each deployment shows the version(s) and their traffic percentages for gradual rollouts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script')
    })
  )
  .output(
    z.object({
      deployments: z.array(deploymentSchema).describe('List of deployments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listDeployments(ctx.input.scriptName);
    let deployments = result?.deployments || result || [];

    let mapped = deployments.map((d: any) => ({
      deploymentId: d.id,
      createdOn: d.created_on,
      source: d.source,
      strategy: d.strategy,
      authorEmail: d.author_email,
      versions: (d.versions || []).map((v: any) => ({
        versionId: v.version_id,
        percentage: v.percentage
      }))
    }));

    return {
      output: { deployments: mapped },
      message: `Found **${mapped.length}** deployment(s) for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();

export let createDeployment = SlateTool.create(spec, {
  name: 'Deploy Worker Version',
  key: 'create_deployment',
  description: `Deploy one or more Worker versions with a traffic split. Supports gradual rollouts by specifying multiple versions with different traffic percentages. Percentages must sum to 100.`,
  instructions: [
    'For a full deployment, provide a single version with 100% traffic.',
    'For a gradual rollout, provide multiple versions whose percentages sum to 100.'
  ]
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      versions: z
        .array(
          z.object({
            versionId: z.string().describe('Version UUID to deploy'),
            percentage: z
              .number()
              .min(0)
              .max(100)
              .describe('Percentage of traffic for this version')
          })
        )
        .min(1)
        .describe('Versions to deploy with traffic percentages (must sum to 100)'),
      force: z.boolean().optional().describe('Bypass deployment blocks')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('Created deployment UUID'),
      strategy: z.string().optional().describe('Deployment strategy'),
      versions: z
        .array(deploymentVersionSchema)
        .optional()
        .describe('Deployed versions with traffic split')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.createDeployment(
      ctx.input.scriptName,
      ctx.input.versions,
      ctx.input.force
    );

    let versions = (result.versions || []).map((v: any) => ({
      versionId: v.version_id,
      percentage: v.percentage
    }));

    return {
      output: {
        deploymentId: result.id,
        strategy: result.strategy,
        versions
      },
      message: `Deployed Worker **${ctx.input.scriptName}** with ${versions.length} version(s).`
    };
  })
  .build();
