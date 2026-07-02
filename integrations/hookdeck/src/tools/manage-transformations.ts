import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireHookdeckInput } from '../lib/errors';
import { spec } from '../spec';

let transformationSchema = z.object({
  transformationId: z.string().describe('Transformation ID'),
  teamId: z.string().describe('Team/project ID'),
  name: z.string().describe('Transformation name'),
  code: z.string().describe('JavaScript (ES6) transformation code'),
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe('Environment variables available to the transformation'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageTransformations = SlateTool.create(spec, {
  name: 'Manage Transformations',
  key: 'manage_transformations',
  description: `Create, update, delete, and list Hookdeck transformations. Transformations are JavaScript (ES6) functions that modify event payloads and headers in transit. Attach them to connections via the transform rule.`,
  instructions: [
    'Transformation code must use: addHandler("transform", (request, context) => { ... return request; })',
    'The request object has: headers, body, query, parsed_query, path.',
    'The runtime is sandboxed — no network, filesystem, promises, or async/await. Limited to 1 second execution.'
  ],
  constraints: [
    'Transformation code is limited to 5 MB.',
    'Execution runtime is limited to 1 second.',
    'No IO, network, or filesystem access in the sandbox.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      transformationId: z
        .string()
        .optional()
        .describe('Transformation ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe(
          'Transformation name (required for create, optional for update/list filter)'
        ),
      code: z
        .string()
        .optional()
        .describe('JavaScript transformation code (required for create, optional for update)'),
      env: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variables for the transformation'),
      limit: z.number().optional().describe('Max results (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      transformation: transformationSchema.optional().describe('Single transformation'),
      transformations: z
        .array(transformationSchema)
        .optional()
        .describe('List of transformations'),
      deletedId: z.string().optional().describe('ID of the deleted transformation'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapTransformation = (t: any) => ({
      transformationId: t.id as string,
      teamId: t.team_id as string,
      name: t.name as string,
      code: t.code as string,
      env: t.env as Record<string, string> | undefined,
      createdAt: t.created_at as string,
      updatedAt: t.updated_at as string
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listTransformations({
          name: ctx.input.name,
          limit: ctx.input.limit,
          next: ctx.input.cursor
        });
        return {
          output: {
            transformations: result.models.map(t => mapTransformation(t)),
            totalCount: result.count,
            nextCursor: result.pagination.next
          },
          message: `Listed **${result.models.length}** transformations (${result.count} total).`
        };
      }
      case 'get': {
        let transformationId = requireHookdeckInput(
          ctx.input.transformationId,
          'transformationId',
          'get'
        );
        let t = await client.getTransformation(transformationId);
        return {
          output: { transformation: mapTransformation(t) },
          message: `Retrieved transformation **${t.name}** (\`${t.id}\`).`
        };
      }
      case 'create': {
        let name = requireHookdeckInput(ctx.input.name, 'name', 'create');
        let code = requireHookdeckInput(ctx.input.code, 'code', 'create');
        let t = await client.createTransformation({
          name,
          code,
          env: ctx.input.env
        });
        return {
          output: { transformation: mapTransformation(t) },
          message: `Created transformation **${t.name}** (\`${t.id}\`).`
        };
      }
      case 'update': {
        let transformationId = requireHookdeckInput(
          ctx.input.transformationId,
          'transformationId',
          'update'
        );
        let t = await client.updateTransformation(transformationId, {
          name: ctx.input.name,
          code: ctx.input.code,
          env: ctx.input.env
        });
        return {
          output: { transformation: mapTransformation(t) },
          message: `Updated transformation **${t.name}** (\`${t.id}\`).`
        };
      }
      case 'delete': {
        let transformationId = requireHookdeckInput(
          ctx.input.transformationId,
          'transformationId',
          'delete'
        );
        let result = await client.deleteTransformation(transformationId);
        return {
          output: { deletedId: result.id },
          message: `Deleted transformation \`${result.id}\`.`
        };
      }
    }
  })
  .build();
