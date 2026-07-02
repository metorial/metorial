import { SlateTool } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import { spec } from '../spec';

let deploymentSchema = z.object({
  deploymentId: z.string().describe('Deployment ID'),
  status: z.number().optional().describe('Deployment status code'),
  message: z.string().optional().describe('Deployment status message'),
  author: z.string().optional().describe('Author of the deployment'),
  authorEmail: z.string().optional().describe('Email of the deployment author'),
  deployer: z.string().optional().describe('Deployer identity'),
  startTime: z.string().optional().describe('Deployment start time (ISO 8601)'),
  endTime: z.string().optional().describe('Deployment end time (ISO 8601)'),
  active: z.boolean().optional().describe('Whether this is the active deployment')
});

export let listDeployments = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List deployment history for an Azure Function App. Returns information about each deployment including author, status, timestamps, and whether it is the currently active deployment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the function app')
    })
  )
  .output(
    z.object({
      deployments: z.array(deploymentSchema).describe('List of deployments'),
      count: z.number().describe('Total number of deployments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ArmClient({
      token: ctx.auth.token,
      subscriptionId: ctx.config.subscriptionId,
      resourceGroupName: ctx.config.resourceGroupName
    });

    ctx.info(`Listing deployments for: ${ctx.input.appName}`);

    let deployments = await client.listDeployments(ctx.input.appName);

    let mapped = deployments.map((d: any) => ({
      deploymentId: d.name || d.id?.split('/')?.pop(),
      status: d.properties?.status,
      message: d.properties?.message,
      author: d.properties?.author,
      authorEmail: d.properties?.author_email,
      deployer: d.properties?.deployer,
      startTime: d.properties?.start_time,
      endTime: d.properties?.end_time,
      active: d.properties?.active
    }));

    return {
      output: {
        deployments: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** deployment(s) for **${ctx.input.appName}**.${mapped.length > 0 ? `\n\nMost recent: ${mapped[0]?.message || mapped[0]?.deploymentId || 'N/A'}` : ''}`
    };
  })
  .build();
