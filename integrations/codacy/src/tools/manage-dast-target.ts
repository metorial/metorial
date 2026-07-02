import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDastTarget = SlateTool.create(spec, {
  name: 'Manage DAST Target',
  key: 'manage_dast_target',
  description: `Create, list, delete, or trigger scans on DAST (Dynamic Application Security Testing) targets. DAST targets can be web applications or APIs (REST with OpenAPI spec or GraphQL). Use this to manage security scanning of your web applications and APIs.`,
  instructions: [
    'To list targets, set action to "list".',
    'To create a target, set action to "create" and provide a URL and target type.',
    'To scan a target, set action to "scan" and provide the target ID.',
    'To delete a target, set action to "delete" and provide the target ID.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'scan', 'delete'])
        .describe('Action to perform on DAST targets.'),
      targetId: z
        .number()
        .optional()
        .describe('Target ID (required for scan and delete actions).'),
      url: z.string().optional().describe('Target URL (required for create action).'),
      targetType: z
        .enum(['webapp', 'openapi', 'graphql'])
        .optional()
        .describe('Type of DAST target (required for create action).'),
      apiDefinitionUrl: z
        .string()
        .optional()
        .describe('OpenAPI specification URL (required for openapi targets).'),
      apiAuthHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Authentication headers for API targets (e.g. {"Authorization": "Bearer token"}).'
        ),
      cursor: z.string().optional().describe('Pagination cursor for list action.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of targets to return for list action.')
    })
  )
  .output(
    z.object({
      targets: z
        .array(
          z.object({
            targetId: z.number().describe('DAST target ID.'),
            url: z.string().optional().describe('Target URL.'),
            targetType: z.string().optional().describe('Target type.'),
            status: z.any().optional().describe('Target status.')
          })
        )
        .optional()
        .describe('List of DAST targets (for list action).'),
      createdTarget: z
        .object({
          targetId: z.number().describe('Created target ID.'),
          url: z.string().optional().describe('Target URL.'),
          targetType: z.string().optional().describe('Target type.')
        })
        .optional()
        .describe('Created DAST target (for create action).'),
      scanTriggered: z
        .boolean()
        .optional()
        .describe('Whether a scan was triggered (for scan action).'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the target was deleted (for delete action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let response = await client.listDastTargets({
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      });

      let targets = (response.data ?? []).map((t: any) => ({
        targetId: t.id ?? 0,
        url: t.url ?? undefined,
        targetType: t.targetType ?? undefined,
        status: t.status ?? undefined
      }));

      return {
        output: { targets },
        message: `Found **${targets.length}** DAST target(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.url || !ctx.input.targetType) {
        throw new Error('URL and targetType are required for creating a DAST target.');
      }

      let body: any = {
        url: ctx.input.url,
        targetType: ctx.input.targetType
      };
      if (ctx.input.apiDefinitionUrl) body.apiDefinitionUrl = ctx.input.apiDefinitionUrl;
      if (ctx.input.apiAuthHeaders) body.apiAuthHeaders = ctx.input.apiAuthHeaders;

      let response = await client.createDastTarget(body);
      let data = response.data ?? response;

      return {
        output: {
          createdTarget: {
            targetId: data.id ?? 0,
            url: data.url ?? ctx.input.url,
            targetType: data.targetType ?? ctx.input.targetType
          }
        },
        message: `Created DAST target for **${ctx.input.url}** (type: ${ctx.input.targetType}).`
      };
    }

    if (ctx.input.action === 'scan') {
      if (ctx.input.targetId == null) {
        throw new Error('targetId is required for triggering a DAST scan.');
      }

      await client.analyzeDastTarget(ctx.input.targetId);

      return {
        output: { scanTriggered: true },
        message: `DAST scan triggered for target **${ctx.input.targetId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (ctx.input.targetId == null) {
        throw new Error('targetId is required for deleting a DAST target.');
      }

      await client.deleteDastTarget(ctx.input.targetId);

      return {
        output: { deleted: true },
        message: `DAST target **${ctx.input.targetId}** has been deleted.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
