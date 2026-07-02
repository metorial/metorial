import { SlateTool } from 'slates';
import { z } from 'zod';
import { kibanaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let kibanaPrivilegeSchema = z.object({
  base: z.array(z.string()).optional().describe('Base privileges (e.g., ["all"], ["read"])'),
  feature: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe(
      'Feature-specific privileges (e.g., {"discover": ["all"], "dashboard": ["read"]})'
    ),
  spaces: z
    .array(z.string())
    .describe('Space IDs this privilege applies to (use ["*"] for all spaces)')
});

let roleOutputSchema = z.object({
  roleName: z.string().describe('Name of the role'),
  elasticsearch: z
    .object({
      cluster: z.array(z.string()).optional().describe('Cluster-level privileges'),
      indices: z
        .array(
          z.object({
            names: z.array(z.string()).describe('Index names or patterns'),
            privileges: z.array(z.string()).describe('Index-level privileges')
          })
        )
        .optional()
        .describe('Index-level privileges'),
      runAs: z.array(z.string()).optional().describe('Users this role can impersonate')
    })
    .optional()
    .describe('Elasticsearch privileges'),
  kibana: z.array(kibanaPrivilegeSchema).optional().describe('Kibana space-level privileges'),
  deleted: z.boolean().optional().describe('Whether the role was deleted')
});

export let listRoles = SlateTool.create(spec, {
  name: 'List Roles',
  key: 'list_roles',
  description: `List all security roles configured in Kibana. Roles define Elasticsearch and Kibana feature privileges.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      roles: z
        .array(
          z.object({
            roleName: z.string().describe('Name of the role'),
            elasticsearch: z
              .object({
                cluster: z.array(z.string()).optional(),
                indices: z.array(z.any()).optional(),
                runAs: z.array(z.string()).optional()
              })
              .optional(),
            kibana: z.array(z.any()).optional()
          })
        )
        .describe('List of roles')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let roles = await client.getRoles();

    let mapped = roles.map((r: any) => ({
      roleName: r.name,
      elasticsearch: r.elasticsearch
        ? {
            cluster: r.elasticsearch.cluster,
            indices: r.elasticsearch.indices,
            runAs: r.elasticsearch.run_as
          }
        : undefined,
      kibana: r.kibana
    }));

    return {
      output: { roles: mapped },
      message: `Found **${mapped.length}** roles.`
    };
  })
  .build();

export let manageRole = SlateTool.create(spec, {
  name: 'Manage Role',
  key: 'manage_role',
  description: `Create, get, update, or delete a Kibana security role. Roles define Elasticsearch cluster/index privileges and Kibana feature privileges per space.`,
  instructions: [
    'Creating and updating use the same PUT endpoint — providing a role name that already exists will update it.',
    'Kibana privileges are defined per space. Use ["*"] to apply to all spaces.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create_or_update', 'delete']).describe('Action to perform'),
      roleName: z.string().describe('Name of the role'),
      elasticsearch: z
        .object({
          cluster: z
            .array(z.string())
            .optional()
            .describe('Cluster privileges (e.g., ["monitor", "manage_index_templates"])'),
          indices: z
            .array(
              z.object({
                names: z.array(z.string()).describe('Index names/patterns (e.g., ["logs-*"])'),
                privileges: z
                  .array(z.string())
                  .describe('Index privileges (e.g., ["read", "write"])')
              })
            )
            .optional()
            .describe('Index-level privileges'),
          runAs: z.array(z.string()).optional().describe('Users this role can run as')
        })
        .optional()
        .describe('Elasticsearch privileges'),
      kibana: z
        .array(kibanaPrivilegeSchema)
        .optional()
        .describe('Kibana feature privileges per space')
    })
  )
  .output(roleOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, roleName, elasticsearch, kibana } = ctx.input;

    if (action === 'get') {
      let role = await client.getRole(roleName);
      return {
        output: {
          roleName: role.name ?? roleName,
          elasticsearch: role.elasticsearch
            ? {
                cluster: role.elasticsearch.cluster,
                indices: role.elasticsearch.indices,
                runAs: role.elasticsearch.run_as
              }
            : undefined,
          kibana: role.kibana
        },
        message: `Retrieved role \`${roleName}\`.`
      };
    }

    if (action === 'create_or_update') {
      let params: Record<string, any> = {};
      if (elasticsearch) {
        params.elasticsearch = {
          cluster: elasticsearch.cluster,
          indices: elasticsearch.indices,
          run_as: elasticsearch.runAs
        };
      }
      if (kibana) params.kibana = kibana;

      await client.createOrUpdateRole(roleName, params);
      let role = await client.getRole(roleName);
      return {
        output: {
          roleName: role.name ?? roleName,
          elasticsearch: role.elasticsearch
            ? {
                cluster: role.elasticsearch.cluster,
                indices: role.elasticsearch.indices,
                runAs: role.elasticsearch.run_as
              }
            : undefined,
          kibana: role.kibana
        },
        message: `Created/updated role \`${roleName}\`.`
      };
    }

    if (action === 'delete') {
      await client.deleteRole(roleName);
      return {
        output: {
          roleName,
          deleted: true
        },
        message: `Deleted role \`${roleName}\`.`
      };
    }

    throw kibanaServiceError(`Unknown action: ${action}`);
  })
  .build();
