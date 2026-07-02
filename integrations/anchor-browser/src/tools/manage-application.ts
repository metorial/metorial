import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageApplication = SlateTool.create(spec, {
  name: 'Manage Applications',
  key: 'manage_application',
  description: `Create, list, retrieve, update, or delete application definitions. Applications represent target websites/services that can have authentication flows and identities configured for automated login.`
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete'])
        .describe('Operation to perform'),
      applicationId: z
        .string()
        .optional()
        .describe('Application ID (required for get, update, delete)'),
      source: z.string().optional().describe('Application source URL (required for create)'),
      name: z.string().optional().describe('Application name (for create)'),
      description: z.string().optional().describe('Application description (for create)'),
      allowedDomains: z
        .array(z.string())
        .optional()
        .describe('Allowed domains list (for update)')
    })
  )
  .output(
    z.object({
      application: z
        .object({
          applicationId: z.string(),
          name: z.string(),
          url: z.string(),
          description: z.string().optional(),
          identityCount: z.number().optional(),
          authMethods: z.array(z.string()).optional(),
          allowedDomains: z.array(z.string()).optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .optional(),
      applications: z
        .array(
          z.object({
            applicationId: z.string(),
            name: z.string(),
            url: z.string(),
            description: z.string().optional(),
            identityCount: z.number().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'create') {
      if (!input.source) throw new Error('source URL is required for create.');
      let result = await client.createApplication({
        source: input.source,
        name: input.name,
        description: input.description
      });
      return {
        output: {
          application: {
            applicationId: result.id,
            name: result.name,
            url: result.url,
            description: result.description,
            createdAt: result.created_at
          }
        },
        message: `Application **${result.name ?? result.id}** created.`
      };
    }

    if (input.action === 'list') {
      let result = await client.listApplications();
      return {
        output: {
          applications: (result.applications ?? []).map(a => ({
            applicationId: a.id,
            name: a.name,
            url: a.url,
            description: a.description,
            identityCount: a.identity_count,
            createdAt: a.created_at
          }))
        },
        message: `Found **${(result.applications ?? []).length}** applications.`
      };
    }

    if (input.action === 'get') {
      if (!input.applicationId) throw new Error('applicationId is required for get.');
      let result = await client.getApplication(input.applicationId);
      return {
        output: {
          application: {
            applicationId: result.id,
            name: result.name,
            url: result.url,
            description: result.description,
            identityCount: result.identity_count,
            authMethods: result.auth_methods,
            allowedDomains: result.allowed_domains,
            createdAt: result.created_at,
            updatedAt: result.updated_at
          }
        },
        message: `Application **${result.name ?? result.id}** retrieved.`
      };
    }

    if (input.action === 'update') {
      if (!input.applicationId) throw new Error('applicationId is required for update.');
      let result = await client.updateApplication(input.applicationId, {
        allowedDomains: input.allowedDomains
      });
      return {
        output: {
          application: {
            applicationId: result.id ?? input.applicationId,
            name: result.name ?? '',
            url: result.url ?? '',
            description: result.description,
            allowedDomains: result.allowed_domains ?? input.allowedDomains
          }
        },
        message: `Application **${input.applicationId}** updated.`
      };
    }

    if (input.action === 'delete') {
      if (!input.applicationId) throw new Error('applicationId is required for delete.');
      await client.deleteApplication(input.applicationId);
      return {
        output: { deleted: true },
        message: `Application **${input.applicationId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
