import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProjectTool = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new Vercel project. Optionally configure build settings, framework, Git repository connection, and environment variables at creation time.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name (used in deployment URLs)'),
      framework: z
        .string()
        .optional()
        .describe('Framework preset (e.g., nextjs, nuxt, vite, gatsby, svelte)'),
      buildCommand: z
        .string()
        .optional()
        .describe('Custom build command (auto-detected if omitted)'),
      installCommand: z
        .string()
        .optional()
        .describe('Custom install command (auto-detected if omitted)'),
      devCommand: z
        .string()
        .optional()
        .describe('Custom dev command (auto-detected if omitted)'),
      outputDirectory: z
        .string()
        .optional()
        .describe('Build output directory (auto-detected if omitted)'),
      rootDirectory: z.string().optional().describe('Root directory of source code'),
      publicSource: z
        .boolean()
        .optional()
        .describe('Whether source code and logs should be public'),
      serverlessFunctionRegion: z
        .string()
        .optional()
        .describe('Default region for serverless functions'),
      gitRepository: z
        .object({
          type: z.enum(['github', 'gitlab', 'bitbucket']).describe('Git provider'),
          repo: z.string().describe('Repository path (e.g., owner/repo)')
        })
        .optional()
        .describe('Git repository to connect'),
      environmentVariables: z
        .array(
          z.object({
            key: z.string().describe('Environment variable name'),
            value: z.string().describe('Environment variable value'),
            target: z
              .array(z.enum(['production', 'preview', 'development']))
              .describe('Target environments')
          })
        )
        .optional()
        .describe('Initial environment variables')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Created project ID'),
      name: z.string().describe('Project name'),
      framework: z.string().optional().nullable().describe('Framework'),
      accountId: z.string().optional().describe('Account ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let data: any = { name: ctx.input.name };
    if (ctx.input.framework) data.framework = ctx.input.framework;
    if (ctx.input.buildCommand) data.buildCommand = ctx.input.buildCommand;
    if (ctx.input.installCommand) data.installCommand = ctx.input.installCommand;
    if (ctx.input.devCommand) data.devCommand = ctx.input.devCommand;
    if (ctx.input.outputDirectory) data.outputDirectory = ctx.input.outputDirectory;
    if (ctx.input.rootDirectory) data.rootDirectory = ctx.input.rootDirectory;
    if (ctx.input.publicSource !== undefined) data.publicSource = ctx.input.publicSource;
    if (ctx.input.serverlessFunctionRegion)
      data.serverlessFunctionRegion = ctx.input.serverlessFunctionRegion;
    if (ctx.input.gitRepository) data.gitRepository = ctx.input.gitRepository;
    if (ctx.input.environmentVariables) {
      data.environmentVariables = ctx.input.environmentVariables.map(e => ({
        ...e,
        type: 'plain'
      }));
    }

    let p = await client.createProject(data);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        framework: p.framework || null,
        accountId: p.accountId
      },
      message: `Created project **${p.name}** (${p.id}).`
    };
  })
  .build();
