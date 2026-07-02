import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Creates a new Neon project. A project is the top-level organizational unit that contains branches, databases, and compute endpoints. You can specify the region, Postgres version, and default compute settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .optional()
        .describe('Name for the new project. Auto-generated if not specified.'),
      regionId: z
        .string()
        .optional()
        .describe(
          'Region for the project (e.g., "aws-us-east-2", "aws-eu-central-1"). Defaults to the closest region.'
        ),
      pgVersion: z
        .number()
        .optional()
        .describe(
          'PostgreSQL version (e.g., 14, 15, 16, 17). Defaults to the latest supported version.'
        ),
      branchName: z
        .string()
        .optional()
        .describe('Name for the default branch. Defaults to main.'),
      databaseName: z
        .string()
        .optional()
        .describe('Name for the default database. Defaults to neondb.'),
      roleName: z
        .string()
        .optional()
        .describe('Name for the default role. Defaults to the database owner role.'),
      storePasswords: z
        .boolean()
        .optional()
        .describe('Whether Neon should store role passwords for retrieval features.'),
      historyRetentionSeconds: z
        .number()
        .optional()
        .describe('Seconds to retain branch history for point-in-time restore.'),
      orgId: z
        .string()
        .optional()
        .describe(
          'Organization ID to create the project in. Creates in personal account if not specified.'
        )
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique identifier of the created project'),
      name: z.string().describe('Name of the created project'),
      regionId: z.string().describe('Region where the project was created'),
      pgVersion: z.number().describe('PostgreSQL version of the project'),
      createdAt: z.string().describe('Timestamp when the project was created'),
      defaultBranchId: z
        .string()
        .optional()
        .describe('ID of the default branch created with the project'),
      connectionUri: z
        .string()
        .optional()
        .describe('Connection URI for the default branch database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });

    let result = await client.createProject({
      name: ctx.input.name,
      regionId: ctx.input.regionId,
      pgVersion: ctx.input.pgVersion,
      branchName: ctx.input.branchName,
      databaseName: ctx.input.databaseName,
      roleName: ctx.input.roleName,
      storePasswords: ctx.input.storePasswords,
      historyRetentionSeconds: ctx.input.historyRetentionSeconds,
      orgId: ctx.input.orgId
    });

    let p = result.project;

    return {
      output: {
        projectId: p.id,
        name: p.name,
        regionId: p.region_id,
        pgVersion: p.pg_version,
        createdAt: p.created_at,
        defaultBranchId: p.default_branch_id,
        connectionUri: result.connection_uris?.[0]?.connection_uri
      },
      message: `Created project **${p.name}** (${p.id}) in region \`${p.region_id}\` with Postgres ${p.pg_version}.`
    };
  })
  .build();
