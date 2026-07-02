import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createServer = SlateTool.create(spec, {
  name: 'Create Server',
  key: 'create_server',
  description: `Add a new deployment server to a DeployHQ project. Supports SSH/SFTP, FTP, FTPS, Amazon S3, S3-compatible storage, Shopify, Netlify, Elastic Beanstalk, and other protocols. Provide the common parameters along with protocol-specific fields.`,
  instructions: [
    'SSH/SFTP and FTP require hostname, username, and password.',
    'Amazon S3 requires bucketName, accessKeyId, and secretAccessKey.',
    'S3-compatible (Cloudflare R2, Wasabi, etc.) also requires customEndpoint.',
    'Shopify requires storeUrl and accessToken.'
  ]
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project'),
      name: z.string().describe('Display name for the server'),
      protocolType: z
        .enum([
          'ssh',
          'ftp',
          'ftps',
          's3',
          's3_compatible',
          'rackspace',
          'digitalocean',
          'shopify',
          'netlify',
          'heroku',
          'elastic_beanstalk',
          'shell'
        ])
        .describe('Connection protocol type'),
      serverPath: z.string().optional().describe('Deployment directory path on the server'),
      branch: z.string().optional().describe('Branch to deploy from'),
      autoDeploy: z.boolean().optional().describe('Enable automatic deployments'),
      environment: z
        .string()
        .optional()
        .describe('Environment label (e.g., Production, Staging, Development)'),
      emailNotifyOn: z
        .enum(['never', 'failure', 'always'])
        .optional()
        .describe('When to send email notifications'),
      rootPath: z.string().optional().describe('Subdirectory in the repository to deploy'),
      serverGroupIdentifier: z
        .string()
        .optional()
        .describe('Identifier of the server group to add this server to'),
      hostname: z.string().optional().describe('Server hostname (for SSH/FTP protocols)'),
      port: z.number().optional().describe('Connection port'),
      username: z.string().optional().describe('Connection username'),
      password: z.string().optional().describe('Connection password'),
      useSshKeys: z
        .boolean()
        .optional()
        .describe('Use SSH keys instead of password (SSH only)'),
      bucketName: z.string().optional().describe('S3 bucket name'),
      accessKeyId: z.string().optional().describe('AWS access key ID (S3)'),
      secretAccessKey: z.string().optional().describe('AWS secret access key (S3)'),
      customEndpoint: z
        .string()
        .optional()
        .describe('Custom S3 endpoint (for S3-compatible storage)'),
      storeUrl: z.string().optional().describe('Shopify store URL'),
      accessToken: z.string().optional().describe('Access token (Shopify/Netlify)'),
      siteId: z.string().optional().describe('Netlify site ID')
    })
  )
  .output(
    z.object({
      serverIdentifier: z.string().describe('Unique server identifier'),
      name: z.string().describe('Server display name'),
      protocolType: z.string().describe('Connection protocol'),
      serverPath: z.string().optional().describe('Deployment path'),
      hostname: z.string().optional().describe('Server hostname'),
      autoDeployUrl: z.string().optional().describe('Auto-deploy webhook URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let serverData: Record<string, any> = {
      name: ctx.input.name,
      protocol_type: ctx.input.protocolType
    };

    if (ctx.input.serverPath !== undefined) serverData.server_path = ctx.input.serverPath;
    if (ctx.input.branch !== undefined) serverData.branch = ctx.input.branch;
    if (ctx.input.autoDeploy !== undefined) serverData.auto_deploy = ctx.input.autoDeploy;
    if (ctx.input.environment !== undefined) serverData.environment = ctx.input.environment;
    if (ctx.input.emailNotifyOn !== undefined)
      serverData.email_notify_on = ctx.input.emailNotifyOn;
    if (ctx.input.rootPath !== undefined) serverData.root_path = ctx.input.rootPath;
    if (ctx.input.serverGroupIdentifier !== undefined)
      serverData.server_group_identifier = ctx.input.serverGroupIdentifier;
    if (ctx.input.hostname !== undefined) serverData.hostname = ctx.input.hostname;
    if (ctx.input.port !== undefined) serverData.port = ctx.input.port;
    if (ctx.input.username !== undefined) serverData.username = ctx.input.username;
    if (ctx.input.password !== undefined) serverData.password = ctx.input.password;
    if (ctx.input.useSshKeys !== undefined) serverData.use_ssh_keys = ctx.input.useSshKeys;
    if (ctx.input.bucketName !== undefined) serverData.bucket_name = ctx.input.bucketName;
    if (ctx.input.accessKeyId !== undefined) serverData.access_key_id = ctx.input.accessKeyId;
    if (ctx.input.secretAccessKey !== undefined)
      serverData.secret_access_key = ctx.input.secretAccessKey;
    if (ctx.input.customEndpoint !== undefined)
      serverData.custom_endpoint = ctx.input.customEndpoint;
    if (ctx.input.storeUrl !== undefined) serverData.store_url = ctx.input.storeUrl;
    if (ctx.input.accessToken !== undefined) serverData.access_token = ctx.input.accessToken;
    if (ctx.input.siteId !== undefined) serverData.site_id = ctx.input.siteId;

    let s = await client.createServer(ctx.input.projectPermalink, serverData);

    return {
      output: {
        serverIdentifier: s.identifier,
        name: s.name,
        protocolType: s.protocol_type,
        serverPath: s.server_path,
        hostname: s.hostname,
        autoDeployUrl: s.auto_deploy_url
      },
      message: `Created server **${s.name}** (\`${s.identifier}\`) using protocol \`${s.protocol_type}\`.`
    };
  })
  .build();
