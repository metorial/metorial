import { createApiServiceError, createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { spec } from '../spec';

let formatTimestamp = (value: unknown) =>
  value === undefined || value === null ? undefined : String(value);

export let manageEdgeFunctions = SlateTool.create(spec, {
  name: 'Manage Edge Functions',
  key: 'manage_edge_functions',
  description: `List, get, create, update, or delete Supabase Edge Functions. Edge Functions are server-side TypeScript functions distributed globally at the edge.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      functionSlug: z
        .string()
        .optional()
        .describe('Function slug (required for get, update, delete)'),
      name: z.string().optional().describe('Function name (required for create)'),
      slug: z.string().optional().describe('Function slug (required for create)'),
      body: z
        .string()
        .optional()
        .describe('Function source code (required for create, optional for update)'),
      entrypointPath: z
        .string()
        .optional()
        .describe('Entrypoint path for deploy/create action (defaults to index.ts)'),
      verifyJwt: z
        .boolean()
        .optional()
        .describe('Whether to verify JWT tokens (default: true)'),
      includeBody: z
        .boolean()
        .optional()
        .describe('For get action, include the function body as a Slate attachment')
    })
  )
  .output(
    z.object({
      functions: z
        .array(
          z.object({
            functionId: z.string().describe('Function ID'),
            slug: z.string().describe('Function slug'),
            name: z.string().describe('Function name'),
            version: z.number().optional().describe('Function version'),
            status: z.string().optional().describe('Function status'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of functions (for list action)'),
      functionDetails: z
        .object({
          functionId: z.string().describe('Function ID'),
          slug: z.string().describe('Function slug'),
          name: z.string().describe('Function name'),
          version: z.number().optional().describe('Function version'),
          status: z.string().optional().describe('Function status'),
          verifyJwt: z.boolean().optional().describe('Whether JWT verification is enabled'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
        .optional()
        .describe('Function details (for get, create, update actions)'),
      bodyIncluded: z
        .boolean()
        .optional()
        .describe('Whether the function body was returned as an attachment'),
      deleted: z.boolean().optional().describe('Whether the function was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);

    let client = new ManagementClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      let data = await client.listEdgeFunctions(projectRef);
      let functions = (Array.isArray(data) ? data : []).map((f: any) => ({
        functionId: f.id ?? '',
        slug: f.slug ?? '',
        name: f.name ?? '',
        version: f.version,
        status: f.status,
        createdAt: formatTimestamp(f.created_at),
        updatedAt: formatTimestamp(f.updated_at)
      }));

      return {
        output: { functions },
        message: `Found **${functions.length}** Edge Functions in project **${projectRef}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.functionSlug)
        throw createApiServiceError('functionSlug is required for get action');
      let f = await client.getEdgeFunction(projectRef, ctx.input.functionSlug);
      let body =
        ctx.input.includeBody === true
          ? await client.getEdgeFunctionBody(projectRef, ctx.input.functionSlug)
          : undefined;
      let bodyText =
        body === undefined
          ? undefined
          : typeof body === 'string'
            ? body
            : JSON.stringify(body);
      return {
        output: {
          functionDetails: {
            functionId: f.id ?? '',
            slug: f.slug ?? '',
            name: f.name ?? '',
            version: f.version,
            status: f.status,
            verifyJwt: f.verify_jwt,
            createdAt: formatTimestamp(f.created_at),
            updatedAt: formatTimestamp(f.updated_at)
          },
          bodyIncluded: bodyText !== undefined ? true : undefined
        },
        attachments:
          bodyText !== undefined
            ? [createTextAttachment(bodyText, 'application/typescript')]
            : undefined,
        message: `Retrieved Edge Function **${f.name ?? ctx.input.functionSlug}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.slug || !ctx.input.body) {
        throw createApiServiceError('name, slug, and body are required for create action');
      }
      let f = await client.createEdgeFunction(projectRef, {
        name: ctx.input.name,
        slug: ctx.input.slug,
        body: ctx.input.body,
        verifyJwt: ctx.input.verifyJwt,
        entrypointPath: ctx.input.entrypointPath
      });
      return {
        output: {
          functionDetails: {
            functionId: f.id ?? '',
            slug: f.slug ?? ctx.input.slug,
            name: f.name ?? ctx.input.name,
            version: f.version,
            status: f.status,
            verifyJwt: f.verify_jwt,
            createdAt: formatTimestamp(f.created_at),
            updatedAt: formatTimestamp(f.updated_at)
          }
        },
        message: `Deployed Edge Function **${ctx.input.name}** (${ctx.input.slug}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.functionSlug)
        throw createApiServiceError('functionSlug is required for update action');
      let f = await client.updateEdgeFunction(projectRef, ctx.input.functionSlug, {
        name: ctx.input.name,
        body: ctx.input.body,
        verifyJwt: ctx.input.verifyJwt
      });
      return {
        output: {
          functionDetails: {
            functionId: f.id ?? '',
            slug: f.slug ?? ctx.input.functionSlug,
            name: f.name ?? '',
            version: f.version,
            status: f.status,
            verifyJwt: f.verify_jwt,
            createdAt: formatTimestamp(f.created_at),
            updatedAt: formatTimestamp(f.updated_at)
          }
        },
        message: `Updated Edge Function **${ctx.input.functionSlug}**.`
      };
    }

    // delete
    if (!ctx.input.functionSlug)
      throw createApiServiceError('functionSlug is required for delete action');
    await client.deleteEdgeFunction(projectRef, ctx.input.functionSlug);
    return {
      output: { deleted: true },
      message: `Deleted Edge Function **${ctx.input.functionSlug}**.`
    };
  })
  .build();
