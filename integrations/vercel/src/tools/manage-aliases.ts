import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { vercelServiceError } from '../lib/errors';
import { spec } from '../spec';

let normalizeAlias = (alias: any) => ({
  aliasId: alias.uid || alias.id || alias.alias,
  alias: alias.alias || alias.name,
  deploymentId: alias.deploymentId || alias.deployment?.id || null,
  projectId: alias.projectId || null,
  createdAt:
    typeof alias.createdAt === 'number'
      ? alias.createdAt
      : alias.created
        ? Date.parse(alias.created)
        : undefined,
  redirect: alias.redirect || null
});

export let manageAliasesTool = SlateTool.create(spec, {
  name: 'Manage Aliases',
  key: 'manage_aliases',
  description:
    'List, retrieve, assign, or delete Vercel deployment aliases. Aliases route custom domains or vercel.app hostnames to deployments.',
  instructions: [
    'Use action "list" to list account or team aliases, optionally filtered by domain or projectId.',
    'Use action "get" to retrieve one alias by hostname or alias ID.',
    'Use action "list_deployment" to list aliases assigned to a deployment.',
    'Use action "assign" to assign an alias to a deployment.',
    'Use action "delete" to remove an alias by hostname or alias ID.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'list_deployment', 'assign', 'delete'])
        .describe('Action to perform'),
      aliasIdOrAlias: z
        .string()
        .optional()
        .describe('Alias hostname or alias ID (required for get and delete)'),
      deploymentId: z
        .string()
        .optional()
        .describe('Deployment ID (required for list_deployment and assign)'),
      alias: z.string().optional().describe('Alias hostname to assign to a deployment'),
      redirect: z
        .string()
        .nullable()
        .optional()
        .describe('Optional redirect target when assigning an alias'),
      domain: z.string().optional().describe('Filter list by domain'),
      projectId: z.string().optional().describe('Filter list or get by project ID'),
      limit: z.number().optional().describe('Maximum number of aliases to return')
    })
  )
  .output(
    z.object({
      aliases: z
        .array(
          z.object({
            aliasId: z.string().optional().describe('Alias ID'),
            alias: z.string().optional().describe('Alias hostname'),
            deploymentId: z.string().optional().nullable().describe('Deployment ID'),
            projectId: z.string().optional().nullable().describe('Project ID'),
            createdAt: z.number().optional().describe('Creation timestamp'),
            redirect: z.string().optional().nullable().describe('Redirect target')
          })
        )
        .optional()
        .describe('List of aliases'),
      alias: z
        .object({
          aliasId: z.string().optional().describe('Alias ID'),
          alias: z.string().optional().describe('Alias hostname'),
          deploymentId: z.string().optional().nullable().describe('Deployment ID'),
          projectId: z.string().optional().nullable().describe('Project ID'),
          createdAt: z.number().optional().describe('Creation timestamp'),
          redirect: z.string().optional().nullable().describe('Redirect target')
        })
        .optional()
        .describe('Alias details'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listAliases({
        domain: ctx.input.domain,
        projectId: ctx.input.projectId,
        limit: ctx.input.limit
      });
      let aliases = (result.aliases || []).map(normalizeAlias);
      return {
        output: { aliases, success: true },
        message: `Found **${aliases.length}** alias(es).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.aliasIdOrAlias) {
        throw vercelServiceError('aliasIdOrAlias is required for get');
      }
      let result = await client.getAlias(ctx.input.aliasIdOrAlias, {
        projectId: ctx.input.projectId
      });
      return {
        output: { alias: normalizeAlias(result), success: true },
        message: `Retrieved alias **${result.alias || ctx.input.aliasIdOrAlias}**.`
      };
    }

    if (action === 'list_deployment') {
      if (!ctx.input.deploymentId) {
        throw vercelServiceError('deploymentId is required for list_deployment');
      }
      let result = await client.listDeploymentAliases(ctx.input.deploymentId);
      let aliases = (result.aliases || []).map(normalizeAlias);
      return {
        output: { aliases, success: true },
        message: `Found **${aliases.length}** alias(es) for deployment **${ctx.input.deploymentId}**.`
      };
    }

    if (action === 'assign') {
      if (!ctx.input.deploymentId || !ctx.input.alias) {
        throw vercelServiceError('deploymentId and alias are required for assign');
      }
      let result = await client.assignAlias(ctx.input.deploymentId, {
        alias: ctx.input.alias,
        redirect: ctx.input.redirect
      });
      return {
        output: { alias: normalizeAlias(result), success: true },
        message: `Assigned alias **${ctx.input.alias}** to deployment **${ctx.input.deploymentId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.aliasIdOrAlias) {
        throw vercelServiceError('aliasIdOrAlias is required for delete');
      }
      await client.deleteAlias(ctx.input.aliasIdOrAlias);
      return {
        output: { success: true },
        message: `Deleted alias **${ctx.input.aliasIdOrAlias}**.`
      };
    }

    throw vercelServiceError(`Unknown action: ${action}`);
  })
  .build();
