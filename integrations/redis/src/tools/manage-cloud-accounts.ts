import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let cloudAccountSchema = z.object({
  cloudAccountId: z.number().describe('Cloud account ID'),
  name: z.string().optional().describe('Cloud account name'),
  provider: z.string().optional().describe('Cloud provider (AWS, GCP, Azure)'),
  status: z.string().optional().describe('Cloud account status'),
  accessKeyId: z.string().optional().describe('Cloud provider access key ID')
});

export let listCloudAccounts = SlateTool.create(spec, {
  name: 'List Cloud Accounts',
  key: 'list_cloud_accounts',
  description: `List all registered cloud provider accounts (AWS, GCP, Azure) used for hosting Redis Cloud subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      cloudAccounts: z.array(cloudAccountSchema).describe('List of cloud accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.listCloudAccounts();
    let rawAccounts = data?.cloudAccounts || data || [];
    if (!Array.isArray(rawAccounts)) rawAccounts = [];

    let cloudAccounts = rawAccounts.map((a: any) => ({
      cloudAccountId: a.id,
      name: a.name,
      provider: a.provider,
      status: a.status,
      accessKeyId: a.accessKeyId
    }));

    return {
      output: { cloudAccounts },
      message: `Found **${cloudAccounts.length}** cloud account(s).`
    };
  })
  .build();

export let getCloudAccount = SlateTool.create(spec, {
  name: 'Get Cloud Account',
  key: 'get_cloud_account',
  description: `Retrieve details for a single Redis Cloud hosting cloud account by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cloudAccountId: z.number().describe('Cloud account ID to retrieve')
    })
  )
  .output(
    z.object({
      cloudAccount: cloudAccountSchema.describe('Cloud account details'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.getCloudAccount(ctx.input.cloudAccountId);

    let cloudAccount = {
      cloudAccountId: data.id,
      name: data.name,
      provider: data.provider,
      status: data.status,
      accessKeyId: data.accessKeyId
    };

    return {
      output: { cloudAccount, raw: data },
      message: `Cloud account **${ctx.input.cloudAccountId}** retrieved.`
    };
  })
  .build();

export let createCloudAccount = SlateTool.create(spec, {
  name: 'Create Cloud Account',
  key: 'create_cloud_account',
  description: `Register a new cloud provider account for hosting Redis Cloud subscriptions. Currently supports AWS accounts.`
})
  .input(
    z.object({
      name: z.string().describe('Cloud account name'),
      provider: z.enum(['AWS', 'GCP', 'Azure']).describe('Cloud provider'),
      accessKeyId: z.string().describe('Cloud provider access key ID'),
      accessSecretKey: z.string().describe('Cloud provider secret access key'),
      consoleUsername: z.string().optional().describe('Cloud console username'),
      consolePassword: z.string().optional().describe('Cloud console password'),
      signInLoginUrl: z.string().optional().describe('Cloud console sign-in URL')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the creation'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let body: Record<string, any> = {
      name: ctx.input.name,
      provider: ctx.input.provider,
      accessKeyId: ctx.input.accessKeyId,
      accessSecretKey: ctx.input.accessSecretKey
    };
    if (ctx.input.consoleUsername) body.consoleUsername = ctx.input.consoleUsername;
    if (ctx.input.consolePassword) body.consolePassword = ctx.input.consolePassword;
    if (ctx.input.signInLoginUrl) body.signInLoginUrl = ctx.input.signInLoginUrl;

    let result = await client.createCloudAccount(body);
    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `Cloud account **${ctx.input.name}** creation initiated. Task ID: **${taskId}**.`
    };
  })
  .build();

export let updateCloudAccount = SlateTool.create(spec, {
  name: 'Update Cloud Account',
  key: 'update_cloud_account',
  description: `Update an existing cloud provider account's credentials or settings.`
})
  .input(
    z.object({
      cloudAccountId: z.number().describe('Cloud account ID to update'),
      name: z.string().optional().describe('New cloud account name'),
      accessKeyId: z.string().optional().describe('New access key ID'),
      accessSecretKey: z.string().optional().describe('New secret access key'),
      consoleUsername: z.string().optional().describe('New console username'),
      consolePassword: z.string().optional().describe('New console password'),
      signInLoginUrl: z.string().optional().describe('New sign-in URL')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the update'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.accessKeyId !== undefined) body.accessKeyId = ctx.input.accessKeyId;
    if (ctx.input.accessSecretKey !== undefined)
      body.accessSecretKey = ctx.input.accessSecretKey;
    if (ctx.input.consoleUsername !== undefined)
      body.consoleUsername = ctx.input.consoleUsername;
    if (ctx.input.consolePassword !== undefined)
      body.consolePassword = ctx.input.consolePassword;
    if (ctx.input.signInLoginUrl !== undefined) body.signInLoginUrl = ctx.input.signInLoginUrl;

    let result = await client.updateCloudAccount(ctx.input.cloudAccountId, body);
    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `Cloud account **${ctx.input.cloudAccountId}** update initiated. Task ID: **${taskId}**.`
    };
  })
  .build();

export let deleteCloudAccount = SlateTool.create(spec, {
  name: 'Delete Cloud Account',
  key: 'delete_cloud_account',
  description: `Delete a registered cloud provider account by ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      cloudAccountId: z.number().describe('Cloud account ID to delete')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the deletion'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let result = await client.deleteCloudAccount(ctx.input.cloudAccountId);
    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `Cloud account **${ctx.input.cloudAccountId}** deletion initiated. Task ID: **${taskId}**.`
    };
  })
  .build();
