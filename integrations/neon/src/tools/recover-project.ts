import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

export let recoverProject = SlateTool.create(spec, {
  name: 'Recover Project',
  key: 'recover_project',
  description: `Recovers a deleted Neon project within the deletion recovery period. Restores branches, endpoints, settings, and connection strings when Neon can still recover the project.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the deleted project to recover')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique identifier of the recovered project'),
      name: z.string().describe('Name of the recovered project'),
      regionId: z.string().describe('Region where the project is hosted'),
      pgVersion: z.number().describe('PostgreSQL version number'),
      defaultBranchId: z.string().optional().describe('ID of the default branch'),
      updatedAt: z.string().describe('Timestamp when the project was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.recoverProject(ctx.input.projectId);
    let p = result.project;

    return {
      output: {
        projectId: p.id,
        name: p.name,
        regionId: p.region_id,
        pgVersion: p.pg_version,
        defaultBranchId: p.default_branch_id,
        updatedAt: p.updated_at
      },
      message: `Recovered project **${p.name}** (${p.id}).`
    };
  })
  .build();
