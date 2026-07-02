import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { vercelServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDomainsTool = SlateTool.create(spec, {
  name: 'Manage Domains',
  key: 'manage_domains',
  description: `List, add, or remove domains from your Vercel account or a specific project. Also supports verifying project domains and retrieving domain configuration.`,
  instructions: [
    'Use action "list" to list all account-level domains.',
    'Use action "list_project" to list domains assigned to a project.',
    'Use action "add_to_project" to add a domain to a project.',
    'Use action "remove_from_project" to remove a domain from a project.',
    'Use action "verify" to trigger domain verification for a project domain.',
    'Use action "add" to add a domain to your Vercel account.',
    'Use action "remove" to remove a domain from your Vercel account.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'list_project',
          'add',
          'remove',
          'add_to_project',
          'remove_from_project',
          'verify'
        ])
        .describe('Action to perform'),
      domain: z
        .string()
        .optional()
        .describe(
          'Domain name (required for add, remove, add_to_project, remove_from_project, verify)'
        ),
      projectIdOrName: z
        .string()
        .optional()
        .describe('Project ID or name (required for project-level actions)'),
      redirect: z.string().optional().describe('Redirect target domain (for add_to_project)'),
      redirectStatusCode: z
        .number()
        .optional()
        .describe('Redirect status code 301 or 302 (for add_to_project)'),
      gitBranch: z
        .string()
        .optional()
        .describe('Git branch to associate with domain (for add_to_project)')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            name: z.string().describe('Domain name'),
            verified: z.boolean().optional().describe('Whether domain is verified'),
            createdAt: z.number().optional().describe('Creation timestamp'),
            registrar: z.string().optional().nullable().describe('Domain registrar')
          })
        )
        .optional()
        .describe('List of domains (for list actions)'),
      domain: z
        .object({
          name: z.string().describe('Domain name'),
          verified: z.boolean().optional().describe('Whether domain is verified')
        })
        .optional()
        .describe('Domain details (for single-domain actions)'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action, domain, projectIdOrName } = ctx.input;

    if (action === 'list') {
      let result = await client.listDomains();
      let domains = (result.domains || []).map((d: any) => ({
        name: d.name,
        verified: d.verified,
        createdAt: d.createdAt,
        registrar: d.registrar || null
      }));
      return {
        output: { domains, success: true },
        message: `Found **${domains.length}** domain(s).`
      };
    }

    if (action === 'list_project') {
      if (!projectIdOrName)
        throw vercelServiceError('projectIdOrName is required for list_project');
      let result = await client.listProjectDomains(projectIdOrName);
      let domains = (result.domains || []).map((d: any) => ({
        name: d.name,
        verified: d.verified,
        createdAt: d.createdAt,
        registrar: null
      }));
      return {
        output: { domains, success: true },
        message: `Found **${domains.length}** domain(s) for project "${projectIdOrName}".`
      };
    }

    if (action === 'add') {
      if (!domain) throw vercelServiceError('domain is required');
      let result = await client.addDomain(domain);
      return {
        output: {
          domain: { name: result.domain?.name || domain, verified: result.domain?.verified },
          success: true
        },
        message: `Added domain **${domain}** to account.`
      };
    }

    if (action === 'remove') {
      if (!domain) throw vercelServiceError('domain is required');
      await client.removeDomain(domain);
      return {
        output: { success: true },
        message: `Removed domain **${domain}** from account.`
      };
    }

    if (action === 'add_to_project') {
      if (!domain || !projectIdOrName)
        throw vercelServiceError('domain and projectIdOrName are required');
      let result = await client.addProjectDomain(projectIdOrName, domain, {
        redirect: ctx.input.redirect,
        redirectStatusCode: ctx.input.redirectStatusCode,
        gitBranch: ctx.input.gitBranch
      });
      return {
        output: {
          domain: { name: result.name || domain, verified: result.verified },
          success: true
        },
        message: `Added domain **${domain}** to project "${projectIdOrName}".`
      };
    }

    if (action === 'remove_from_project') {
      if (!domain || !projectIdOrName)
        throw vercelServiceError('domain and projectIdOrName are required');
      await client.removeProjectDomain(projectIdOrName, domain);
      return {
        output: { success: true },
        message: `Removed domain **${domain}** from project "${projectIdOrName}".`
      };
    }

    if (action === 'verify') {
      if (!domain || !projectIdOrName)
        throw vercelServiceError('domain and projectIdOrName are required');
      let result = await client.verifyProjectDomain(projectIdOrName, domain);
      return {
        output: {
          domain: { name: result.name || domain, verified: result.verified },
          success: true
        },
        message: `Verification for **${domain}**: ${result.verified ? 'verified' : 'pending'}.`
      };
    }

    throw vercelServiceError(`Unknown action: ${action}`);
  })
  .build();
