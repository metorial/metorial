import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let executeQuery = SlateTool.create(spec, {
  name: 'Execute Query',
  key: 'execute_query',
  description: `Execute a SQL query against a workspace's Steampipe database. Steampipe exposes cloud provider APIs as SQL-queryable Postgres tables, allowing you to query resources like AWS S3 buckets, Azure VMs, GCP instances, and more using standard SQL.`,
  instructions: [
    'The SQL is executed against the Steampipe database in the specified workspace.',
    'Tables available depend on the plugins and connections configured in the workspace.',
    'Common table patterns: aws_s3_bucket, azure_compute_virtual_machine, gcp_compute_instance, etc.'
  ],
  constraints: ['Query results may be truncated for very large result sets.']
})
  .input(
    z.object({
      sql: z
        .string()
        .describe('SQL query to execute against the workspace Steampipe database'),
      workspaceHandle: z.string().describe('Handle of the workspace to query'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.unknown())).describe('Query result rows'),
      columns: z
        .array(
          z.object({
            name: z.string().describe('Column name'),
            dataType: z.string().describe('Column data type')
          })
        )
        .optional()
        .describe('Column metadata'),
      rowCount: z.number().describe('Number of rows returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let result: any;
    if (ctx.input.ownerType === 'org') {
      result = await client.executeOrgQuery(
        ownerHandle,
        ctx.input.workspaceHandle,
        ctx.input.sql
      );
    } else {
      result = await client.executeQuery(
        ownerHandle,
        ctx.input.workspaceHandle,
        ctx.input.sql
      );
    }

    return {
      output: {
        rows: result.items,
        columns: result.columns,
        rowCount: result.items.length
      },
      message: `Query returned **${result.items.length}** row(s).`
    };
  })
  .build();
