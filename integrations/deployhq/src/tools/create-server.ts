import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateInteger } from '../lib/client';
import { spec } from '../spec';

export let createServer = SlateTool.create(spec, {
  name: 'Create Server',
  key: 'create_server',
  description: `Add a new deployment server to a DeployHQ project. Supports SSH/SFTP, FTP, FTPS, Amazon S3, S3-compatible storage, Shopify, Netlify, Elastic Beanstalk, and other protocols. Provide the common parameters along with protocol-specific fields.`,
  instructions: [
    'SSH/SFTP requires hostname and username; provide password unless useSshKeys is enabled. FTP and FTPS also require a password.',
    'Amazon S3 requires bucketName, accessKeyId, and secretAccessKey.',
    'S3-compatible (Cloudflare R2, Wasabi, etc.) also requires customEndpoint.',
    'Shopify requires storeUrl and accessToken.'
  ]
})
  .input(
    z.object({
      projectPermalink: z
        .string()
        .describe('Project permalink or identifier. Call list_projects to discover projects.'),
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
          'digital_ocean',
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
      siteId: z.string().optional().describe('Netlify site ID'),
      rackspaceApiKey: z.string().optional().describe('Rackspace API key'),
      region: z.string().optional().describe('Rackspace or AWS Elastic Beanstalk region'),
      containerName: z.string().optional().describe('Rackspace container name'),
      personalAccessToken: z
        .string()
        .optional()
        .describe('DigitalOcean personal access token'),
      dropletId: z.string().optional().describe('DigitalOcean droplet ID'),
      dropletName: z.string().optional().describe('DigitalOcean droplet name'),
      shellCommand: z.string().optional().describe('Command for a Shell server'),
      shellTimeout: z
        .number()
        .optional()
        .describe('Shell command timeout in seconds: 300, 600, 1800, 3600, 5400, or 10800'),
      herokuAppName: z.string().optional().describe('Heroku application name'),
      herokuApiKey: z.string().optional().describe('Heroku API key'),
      applicationName: z.string().optional().describe('Elastic Beanstalk application name'),
      environmentName: z.string().optional().describe('Elastic Beanstalk environment name')
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

    validateInteger(ctx.input.port, 'port', 1, 65535);
    let required: string[] = [];
    if (['ssh', 'ftp', 'ftps'].includes(ctx.input.protocolType)) {
      if (!ctx.input.hostname) required.push('hostname');
      if (!ctx.input.username) required.push('username');
      if (!ctx.input.password && !(ctx.input.protocolType === 'ssh' && ctx.input.useSshKeys))
        required.push('password');
    }
    if (['s3', 's3_compatible'].includes(ctx.input.protocolType)) {
      if (!ctx.input.bucketName) required.push('bucketName');
      if (!ctx.input.accessKeyId) required.push('accessKeyId');
      if (!ctx.input.secretAccessKey) required.push('secretAccessKey');
      if (ctx.input.protocolType === 's3_compatible' && !ctx.input.customEndpoint)
        required.push('customEndpoint');
    }
    for (let [protocols, fields] of [
      [['shopify'], ['storeUrl', 'accessToken']],
      [['netlify'], ['siteId', 'accessToken']],
      [['rackspace'], ['username', 'rackspaceApiKey', 'region', 'containerName']],
      [
        ['digitalocean', 'digital_ocean'],
        ['personalAccessToken', 'dropletId', 'dropletName']
      ],
      [['shell'], ['shellCommand']],
      [['heroku'], ['herokuAppName', 'herokuApiKey']],
      [
        ['elastic_beanstalk'],
        ['applicationName', 'environmentName', 'region', 'accessKeyId', 'secretAccessKey']
      ]
    ] as const) {
      if ((protocols as readonly string[]).includes(ctx.input.protocolType)) {
        for (let field of fields) if (!ctx.input[field]) required.push(field);
      }
    }
    if (
      ctx.input.shellTimeout !== undefined &&
      ![300, 600, 1800, 3600, 5400, 10800].includes(ctx.input.shellTimeout)
    ) {
      throw createApiServiceError(
        'shellTimeout must be 300, 600, 1800, 3600, 5400, or 10800 seconds.'
      );
    }
    if (required.length)
      throw createApiServiceError(
        `Provide ${required.join(', ')} for ${ctx.input.protocolType} servers.`
      );

    let serverData: Record<string, any> = {
      name: ctx.input.name,
      protocol_type:
        ctx.input.protocolType === 'digitalocean' ? 'digital_ocean' : ctx.input.protocolType
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

    Object.assign(
      serverData,
      pickDefined({
        api_key: ctx.input.rackspaceApiKey,
        region: ctx.input.region,
        container_name: ctx.input.containerName,
        personal_access_token: ctx.input.personalAccessToken,
        droplet_id: ctx.input.dropletId,
        droplet_name: ctx.input.dropletName,
        command: ctx.input.shellCommand,
        timeout: ctx.input.shellTimeout,
        app_name: ctx.input.herokuAppName,
        api_key_heroku: ctx.input.herokuApiKey,
        application_name: ctx.input.applicationName,
        environment_name: ctx.input.environmentName
      })
    );

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
