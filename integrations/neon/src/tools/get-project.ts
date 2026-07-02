import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieves detailed information about a specific Neon project, including its configuration, connection URI, consumption metrics, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique identifier of the project'),
      name: z.string().describe('Name of the project'),
      regionId: z.string().describe('Region where the project is hosted'),
      pgVersion: z.number().describe('PostgreSQL version number'),
      storePasswords: z.boolean().optional().describe('Whether passwords are stored'),
      createdAt: z.string().describe('Timestamp when the project was created'),
      updatedAt: z.string().describe('Timestamp when the project was last updated'),
      defaultBranchId: z.string().optional().describe('ID of the default branch'),
      orgId: z.string().optional().describe('Organization the project belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.getProject(ctx.input.projectId);
    let p = result.project;

    return {
      output: {
        projectId: p.id,
        name: p.name,
        regionId: p.region_id,
        pgVersion: p.pg_version,
        storePasswords: p.store_passwords,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        defaultBranchId: p.default_branch_id,
        orgId: p.org_id
      },
      message: `Retrieved project **${p.name}** (${p.id}) in region \`${p.region_id}\` running Postgres ${p.pg_version}.`
    };
  })
  .build();
