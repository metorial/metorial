import { createApiServiceError, SlateTool } from 'slates';
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
          url: z.string().optional(),
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
            url: z.string().optional(),
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
      if (!input.source) throw createApiServiceError('source URL is required for create.');
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
            url: result.url ?? undefined,
            description: result.description ?? undefined,
            createdAt: result.created_at ?? undefined
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
            url: a.url ?? undefined,
            description: a.description ?? undefined,
            identityCount: a.identity_count ?? undefined,
            createdAt: a.created_at ?? undefined
          }))
        },
        message: `Found **${(result.applications ?? []).length}** applications.`
      };
    }

    if (input.action === 'get') {
      if (!input.applicationId)
        throw createApiServiceError('applicationId is required for get.');
      let result = await client.getApplication(input.applicationId);
      return {
        output: {
          application: {
            applicationId: result.id,
            name: result.name,
            url: result.url ?? undefined,
            description: result.description ?? undefined,
            identityCount: result.identity_count ?? undefined,
            authMethods: result.auth_methods ?? undefined,
            allowedDomains: result.allowed_domains ?? undefined,
            createdAt: result.created_at ?? undefined,
            updatedAt: result.updated_at ?? undefined
          }
        },
        message: `Application **${result.name ?? result.id}** retrieved.`
      };
    }

    if (input.action === 'update') {
      if (!input.applicationId)
        throw createApiServiceError('applicationId is required for update.');
      let result = await client.updateApplication(input.applicationId, {
        allowedDomains: input.allowedDomains
      });
      return {
        output: {
          application: {
            applicationId: result.id ?? input.applicationId,
            name: result.name ?? '',
            url: result.url ?? '',
            description: result.description ?? undefined,
            allowedDomains: result.allowed_domains ?? input.allowedDomains
          }
        },
        message: `Application **${input.applicationId}** updated.`
      };
    }

    if (input.action === 'delete') {
      if (!input.applicationId)
        throw createApiServiceError('applicationId is required for delete.');
      await client.deleteApplication(input.applicationId);
      return {
        output: { deleted: true },
        message: `Application **${input.applicationId}** deleted.`
      };
    }

    throw createApiServiceError(`Unknown action: ${input.action}`);
  })
  .build();
