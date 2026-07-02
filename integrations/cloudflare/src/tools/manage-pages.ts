import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let managePagesTool = SlateTool.create(spec, {
  name: 'Manage Pages Projects',
  key: 'manage_pages',
  description: `List, get details, or manage Cloudflare Pages projects and their deployments. View deployment history, rollback to a previous deployment, or delete deployments and projects.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_projects',
          'get_project',
          'delete_project',
          'list_deployments',
          'get_deployment',
          'rollback_deployment',
          'delete_deployment'
        ])
        .describe('Operation to perform'),
      accountId: z.string().optional().describe('Account ID (uses config if not provided)'),
      projectName: z.string().optional().describe('Pages project name'),
      deploymentId: z.string().optional().describe('Deployment ID')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectName: z.string(),
            subdomain: z.string().optional(),
            productionBranch: z.string().optional(),
            createdOn: z.string().optional()
          })
        )
        .optional(),
      project: z
        .object({
          projectName: z.string(),
          subdomain: z.string().optional(),
          productionBranch: z.string().optional(),
          domains: z.array(z.string()).optional(),
          source: z.string().optional()
        })
        .optional(),
      deployments: z
        .array(
          z.object({
            deploymentId: z.string(),
            url: z.string().optional(),
            environment: z.string().optional(),
            createdOn: z.string().optional(),
            isCurrentDeployment: z.boolean().optional()
          })
        )
        .optional(),
      deployment: z
        .object({
          deploymentId: z.string(),
          url: z.string().optional(),
          environment: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let accountId = ctx.input.accountId || ctx.config.accountId;
    if (!accountId) throw cloudflareServiceError('accountId is required');

    let client = new Client(ctx.auth);
    let { action } = ctx.input;

    if (action === 'list_projects') {
      let response = await client.listPagesProjects(accountId);
      let projects = response.result.map((p: any) => ({
        projectName: p.name,
        subdomain: p.subdomain,
        productionBranch: p.production_branch,
        createdOn: p.created_on
      }));
      return {
        output: { projects },
        message: `Found **${projects.length}** Pages project(s).`
      };
    }

    if (action === 'get_project') {
      if (!ctx.input.projectName) throw cloudflareServiceError('projectName is required');
      let response = await client.getPagesProject(accountId, ctx.input.projectName);
      let p = response.result;
      return {
        output: {
          project: {
            projectName: p.name,
            subdomain: p.subdomain,
            productionBranch: p.production_branch,
            domains: p.domains || [],
            source: p.source?.type
          }
        },
        message: `Pages project **${p.name}** — Branch: ${p.production_branch}, Subdomain: ${p.subdomain}`
      };
    }

    if (action === 'delete_project') {
      if (!ctx.input.projectName) throw cloudflareServiceError('projectName is required');
      await client.deletePagesProject(accountId, ctx.input.projectName);
      return {
        output: { deleted: true },
        message: `Deleted Pages project **${ctx.input.projectName}**.`
      };
    }

    if (action === 'list_deployments') {
      if (!ctx.input.projectName) throw cloudflareServiceError('projectName is required');
      let response = await client.listPagesDeployments(accountId, ctx.input.projectName);
      let deployments = response.result.map((d: any) => ({
        deploymentId: d.id,
        url: d.url,
        environment: d.environment,
        createdOn: d.created_on,
        isCurrentDeployment: d.is_skipped === false
      }));
      return {
        output: { deployments },
        message: `Found **${deployments.length}** deployment(s) for project **${ctx.input.projectName}**.`
      };
    }

    if (action === 'get_deployment') {
      if (!ctx.input.projectName || !ctx.input.deploymentId) {
        throw cloudflareServiceError('projectName and deploymentId are required');
      }
      let response = await client.getPagesDeployment(
        accountId,
        ctx.input.projectName,
        ctx.input.deploymentId
      );
      let d = response.result;
      return {
        output: {
          deployment: {
            deploymentId: d.id,
            url: d.url,
            environment: d.environment
          }
        },
        message: `Deployment \`${d.id}\` — URL: ${d.url}, Environment: ${d.environment}`
      };
    }

    if (action === 'rollback_deployment') {
      if (!ctx.input.projectName || !ctx.input.deploymentId) {
        throw cloudflareServiceError('projectName and deploymentId are required');
      }
      let response = await client.rollbackPagesDeployment(
        accountId,
        ctx.input.projectName,
        ctx.input.deploymentId
      );
      return {
        output: {
          deployment: {
            deploymentId: response.result?.id || ctx.input.deploymentId,
            url: response.result?.url,
            environment: response.result?.environment
          }
        },
        message: `Rolled back to deployment \`${ctx.input.deploymentId}\`.`
      };
    }

    if (action === 'delete_deployment') {
      if (!ctx.input.projectName || !ctx.input.deploymentId) {
        throw cloudflareServiceError('projectName and deploymentId are required');
      }
      await client.deletePagesDeployment(
        accountId,
        ctx.input.projectName,
        ctx.input.deploymentId
      );
      return {
        output: { deleted: true },
        message: `Deleted deployment \`${ctx.input.deploymentId}\`.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
