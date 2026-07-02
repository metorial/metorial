import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let createApplication = SlateTool.create(spec, {
  name: 'Create Application',
  key: 'create_application',
  description: `Create a new web application on a server. Supports one-click installers (WordPress, Mautic, Moodle, Joomla, etc.), custom PHP apps, and Git-based deployments.
The required parameters vary by framework. Use **frameworkSettings** for framework-specific options like WordPress title, username, password, etc.`,
  instructions: [
    'For one-click installs (e.g. WordPress), set method to "one_click" and framework to the app name.',
    'For custom PHP apps, set method to "custom" and framework to "custom".',
    'For Git deployments, set method to "git" and framework to "github", "gitlab", or "bitbucket".',
    'Either use a temporary domain (tempDomain: true) or provide a custom hostname.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z.string().describe('Server ID to create the application on'),
      name: z.string().describe('Application name'),
      method: z.enum(['custom', 'one_click', 'git']).describe('Installation method'),
      framework: z
        .string()
        .describe(
          'Framework/app type: custom, wordpress, mautic, moodle, joomla, prestashop, akaunting, statamic, nextcloud, phpmyadmin, craftcms, github, gitlab, bitbucket'
        ),
      tempDomain: z.boolean().describe('Use a ServerAvatar temporary domain'),
      tempSubDomainName: z
        .string()
        .optional()
        .describe('Temporary subdomain name (required if tempDomain is true)'),
      hostname: z
        .string()
        .optional()
        .describe('Custom domain hostname (required if tempDomain is false)'),
      systemUser: z
        .enum(['new', 'existing'])
        .describe('Create new or use existing system user'),
      systemUserId: z
        .number()
        .optional()
        .describe('Existing system user ID (required if systemUser is "existing")'),
      systemUserUsername: z
        .string()
        .optional()
        .describe('New system user username (required if systemUser is "new")'),
      systemUserPassword: z
        .string()
        .optional()
        .describe('New system user password (required if systemUser is "new")'),
      www: z.boolean().default(false).describe('Add www subdomain prefix'),
      phpVersion: z
        .string()
        .optional()
        .describe('PHP version (e.g. "8.2") - required for PHP apps'),
      frameworkSettings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Framework-specific settings (e.g. WordPress: title, username, password, email, database_name)'
        )
    })
  )
  .output(
    z.object({
      application: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Created application details'),
      responseMessage: z.string().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let body: Record<string, unknown> = {
      name: ctx.input.name,
      method: ctx.input.method,
      framework: ctx.input.framework,
      temp_domain: ctx.input.tempDomain,
      www: ctx.input.www,
      systemUser: ctx.input.systemUser
    };

    if (ctx.input.tempSubDomainName) body.temp_sub_domain_name = ctx.input.tempSubDomainName;
    if (ctx.input.hostname) body.hostname = ctx.input.hostname;
    if (ctx.input.systemUserId) body.systemUserId = ctx.input.systemUserId;
    if (ctx.input.systemUserUsername || ctx.input.systemUserPassword) {
      body['systemUserInfo[username]'] = ctx.input.systemUserUsername;
      body['systemUserInfo[password]'] = ctx.input.systemUserPassword;
    }
    if (ctx.input.phpVersion) body.php_version = ctx.input.phpVersion;

    if (ctx.input.frameworkSettings) {
      for (let [key, value] of Object.entries(ctx.input.frameworkSettings)) {
        body[key] = value;
      }
    }

    let result = await client.createApplication(orgId, ctx.input.serverId, body);

    return {
      output: {
        application: (result as Record<string, unknown>).application as
          | Record<string, unknown>
          | undefined,
        responseMessage:
          ((result as Record<string, unknown>).message as string) || 'Application created'
      },
      message: `Application **${ctx.input.name}** created with framework **${ctx.input.framework}** on server ${ctx.input.serverId}.`
    };
  })
  .build();
