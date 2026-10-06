import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid } from '../lib/schemas';
import { spec } from '../spec';

export let manageHook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_hook',
  description: `Get details, create, rename, enable, disable, ping, or delete a webhook (hook). Use "ping" to read native gone/attached/learning metadata without sending a payload. Use "enable"/"disable" to control whether the hook accepts incoming data.`,
  instructions: [
    'For "create", provide teamId, name, and typeName (e.g. "gateway-webhook").',
    'For "rename", provide hookId and name.',
    '"ping" does not prove network reachability. Enabled hooks accept payloads; dependent executions and retention can continue.'
  ]
})
  .input(
    z.object({
      method: z
        .boolean()
        .optional()
        .describe('Include request method in received payloads; defaults to false.'),
      headers: z
        .boolean()
        .optional()
        .describe('Include request headers in received payloads; defaults to false.'),
      stringify: z
        .boolean()
        .optional()
        .describe('Return JSON payloads as strings; defaults to false.'),
      confirmed: z
        .boolean()
        .optional()
        .describe(
          'Explicitly acknowledge the provider confirmation for referenced resources or app installation; omission does not bypass it.'
        ),
      action: z
        .enum(['get', 'create', 'rename', 'enable', 'disable', 'ping', 'delete'])
        .describe('Action to perform'),
      hookId: z
        .number()
        .optional()
        .describe('Hook ID (required for get, rename, enable, disable, ping, delete)'),
      teamId: z
        .number()
        .optional()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs. (required for create)'
        ),
      name: z.string().optional().describe('Hook name (required for create and rename)'),
      typeName: z
        .string()
        .optional()
        .describe(
          'Hook type, e.g. "gateway-webhook" or "gateway-mailhook" (required for create)'
        )
    })
  )
  .output(
    z.object({
      hookId: z.number().optional().describe('Hook ID'),
      name: z.string().optional().describe('Hook name'),
      url: z.string().optional().describe('Hook URL'),
      typeName: z.string().optional().describe('Hook type'),
      enabled: z.boolean().optional().describe('Whether the hook is enabled'),
      gone: z.boolean().optional(),
      attached: z.boolean().optional(),
      learning: z.boolean().optional(),
      alive: z.boolean().optional().describe('Whether the hook responded to ping'),
      deleted: z.boolean().optional().describe('Whether the hook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const { action } = ctx.input;
    if (action === 'ping') {
      const result = await client.pingHook(ctx.input.hookId!);
      return {
        output: {
          hookId: ctx.input.hookId,
          alive: !result.gone,
          gone: result.gone,
          attached: result.attached,
          learning: result.learning
        },
        message:
          'Retrieved native hook availability metadata. This does not send a payload or prove network reachability.'
      };
    }
    if (action === 'delete') {
      await client.deleteHook(ctx.input.hookId!, ctx.input.confirmed);
      return {
        output: { hookId: ctx.input.hookId, deleted: true },
        message:
          'Make acknowledged exact hook deletion. Dependent scenarios can fail; prior payloads, history, and external effects are not erased.'
      };
    }
    if (action === 'rename' && ctx.input.name === undefined)
      throw invalid('name is required for rename.');
    const result =
      action === 'get'
        ? await client.getHook(ctx.input.hookId!)
        : action === 'create'
          ? await client.createHook(ctx.input)
          : action === 'rename'
            ? await client.updateHook(ctx.input.hookId!, { name: ctx.input.name! })
            : action === 'enable'
              ? await client.enableHook(ctx.input.hookId!)
              : await client.disableHook(ctx.input.hookId!);
    const h = result.hook;
    return {
      output: {
        hookId: h.id,
        name: h.name,
        url: h.url ?? undefined,
        typeName: h.typeName,
        enabled: h.enabled
      },
      message: `Confirmed native hook ${action}. An enabled hook accepts incoming data; scenario executions and retained payloads depend on its assignment.`
    };
  })
  .build();
