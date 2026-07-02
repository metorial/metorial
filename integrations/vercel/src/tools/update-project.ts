import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProjectTool = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update settings for an existing Vercel project. Modify build configuration, framework, Node.js version, protection settings, and other project-level options.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectIdOrName: z.string().describe('Project ID or name'),
      name: z.string().optional().describe('New project name'),
      framework: z.string().optional().describe('Framework preset'),
      nodeVersion: z.string().optional().describe('Node.js version (e.g., "20.x", "18.x")'),
      buildCommand: z
        .string()
        .optional()
        .nullable()
        .describe('Build command (null for auto-detect)'),
      installCommand: z
        .string()
        .optional()
        .nullable()
        .describe('Install command (null for auto-detect)'),
      devCommand: z
        .string()
        .optional()
        .nullable()
        .describe('Dev command (null for auto-detect)'),
      outputDirectory: z
        .string()
        .optional()
        .nullable()
        .describe('Output directory (null for auto-detect)'),
      rootDirectory: z.string().optional().nullable().describe('Root directory path'),
      publicSource: z.boolean().optional().describe('Whether deployments are public'),
      gitForkProtection: z.boolean().optional().describe('Require auth for fork PRs')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Updated project ID'),
      name: z.string().describe('Project name'),
      framework: z.string().optional().nullable().describe('Framework'),
      updatedAt: z.number().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { projectIdOrName, ...updateData } = ctx.input;
    let cleanData: Record<string, any> = {};
    for (let [k, v] of Object.entries(updateData)) {
      if (v !== undefined) {
        cleanData[k] = v;
      }
    }

    let p = await client.updateProject(projectIdOrName, cleanData);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        framework: p.framework || null,
        updatedAt: p.updatedAt
      },
      message: `Updated project **${p.name}** (${p.id}).`
    };
  })
  .build();
