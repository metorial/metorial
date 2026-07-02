import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a Vercel project by its ID or name. Returns project settings, build configuration, framework, environment details, and associated domains.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectIdOrName: z.string().describe('Project ID or name')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique project identifier'),
      name: z.string().describe('Project name'),
      framework: z.string().optional().nullable().describe('Framework (e.g., nextjs, nuxt)'),
      nodeVersion: z.string().optional().describe('Node.js version'),
      buildCommand: z.string().optional().nullable().describe('Build command'),
      installCommand: z.string().optional().nullable().describe('Install command'),
      devCommand: z.string().optional().nullable().describe('Dev command'),
      outputDirectory: z.string().optional().nullable().describe('Output directory'),
      rootDirectory: z.string().optional().nullable().describe('Root directory'),
      publicSource: z
        .boolean()
        .optional()
        .nullable()
        .describe('Whether source code is public'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      updatedAt: z.number().optional().describe('Last update timestamp'),
      accountId: z.string().optional().describe('Account identifier'),
      gitRepository: z
        .object({
          type: z.string().optional(),
          repo: z.string().optional()
        })
        .optional()
        .nullable()
        .describe('Connected Git repository')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let p = await client.getProject(ctx.input.projectIdOrName);

    let output = {
      projectId: p.id,
      name: p.name,
      framework: p.framework || null,
      nodeVersion: p.nodeVersion,
      buildCommand: p.buildCommand || null,
      installCommand: p.installCommand || null,
      devCommand: p.devCommand || null,
      outputDirectory: p.outputDirectory || null,
      rootDirectory: p.rootDirectory || null,
      publicSource: p.publicSource || null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      accountId: p.accountId,
      gitRepository: p.link
        ? {
            type: p.link.type,
            repo: p.link.repo
          }
        : null
    };

    return {
      output,
      message: `Project **${p.name}** (${p.id}) uses framework: ${p.framework || 'none'}.`
    };
  })
  .build();
