import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

let deploymentSchema = z.object({
  deploymentId: z.string().describe('Unique deployment identifier'),
  projectId: z.string().describe('Associated project ID'),
  chatId: z.string().describe('Associated chat ID'),
  versionId: z.string().describe('Associated version ID'),
  inspectorUrl: z.string().optional().describe('URL to the deployment inspector'),
  apiUrl: z.string().optional().describe('API endpoint URL'),
  webUrl: z.string().optional().describe('Web URL for the deployment')
});

export let createDeploymentTool = SlateTool.create(spec, {
  name: 'Create Deployment',
  key: 'create_deployment',
  description: `Deploy a specific version of a V0 chat to Vercel. Requires a project, chat, and version ID. The deployment will be hosted on Vercel's platform with a unique URL.`,
  instructions: [
    "The versionId can be obtained from a chat's latestVersionId after creating a chat or sending a message."
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('Project to deploy to'),
      chatId: z.string().describe('Chat containing the code to deploy'),
      versionId: z.string().describe('Specific version of the chat to deploy')
    })
  )
  .output(deploymentSchema)
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.createDeployment(ctx.input);

    return {
      output: {
        deploymentId: result.id,
        projectId: result.projectId,
        chatId: result.chatId,
        versionId: result.versionId,
        inspectorUrl: result.inspectorUrl,
        apiUrl: result.apiUrl,
        webUrl: result.webUrl
      },
      message: `Created deployment **${result.id}**. ${result.webUrl ? `[View](${result.webUrl})` : ''}`
    };
  })
  .build();

export let getDeploymentTool = SlateTool.create(spec, {
  name: 'Get Deployment',
  key: 'get_deployment',
  description: `Retrieve details of a specific deployment including its status, URLs, and associated project/chat/version information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('The deployment ID to retrieve')
    })
  )
  .output(deploymentSchema)
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.getDeployment(ctx.input.deploymentId);

    return {
      output: {
        deploymentId: result.id,
        projectId: result.projectId,
        chatId: result.chatId,
        versionId: result.versionId,
        inspectorUrl: result.inspectorUrl,
        apiUrl: result.apiUrl,
        webUrl: result.webUrl
      },
      message: `Retrieved deployment **${result.id}**. ${result.webUrl ? `[View](${result.webUrl})` : ''}`
    };
  })
  .build();

export let listDeploymentsTool = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `Find deployments for a specific project, chat, and version combination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to filter by'),
      chatId: z.string().describe('Chat ID to filter by'),
      versionId: z.string().describe('Version ID to filter by')
    })
  )
  .output(
    z.object({
      deployments: z.array(deploymentSchema).describe('List of deployments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.listDeployments(ctx.input);

    let deployments = (result.data || []).map((d: any) => ({
      deploymentId: d.id,
      projectId: d.projectId,
      chatId: d.chatId,
      versionId: d.versionId,
      inspectorUrl: d.inspectorUrl,
      apiUrl: d.apiUrl,
      webUrl: d.webUrl
    }));

    return {
      output: { deployments },
      message: `Found **${deployments.length}** deployment(s).`
    };
  })
  .build();

export let deleteDeploymentTool = SlateTool.create(spec, {
  name: 'Delete Deployment',
  key: 'delete_deployment',
  description: `Delete a deployment from Vercel. This will remove the deployed application and its URL.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('The deployment ID to delete')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('ID of the deleted deployment'),
      deleted: z.boolean().describe('Whether the deployment was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    await client.deleteDeployment(ctx.input.deploymentId);

    return {
      output: {
        deploymentId: ctx.input.deploymentId,
        deleted: true
      },
      message: `Deleted deployment ${ctx.input.deploymentId}.`
    };
  })
  .build();
