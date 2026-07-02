import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let hookOutputSchema = z.object({
  hookId: z.string().describe('Unique hook identifier'),
  siteId: z.string().describe('Site this hook belongs to'),
  hookType: z.string().describe('Hook type (e.g., url, email, slack)'),
  event: z.string().describe('Event that triggers this hook'),
  disabled: z.boolean().optional().describe('Whether the hook is disabled'),
  createdAt: z.string().optional().describe('Hook creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapHook = (hook: any) => ({
  hookId: hook.id,
  siteId: hook.site_id,
  hookType: hook.type || '',
  event: hook.event || '',
  disabled: hook.disabled ?? undefined,
  createdAt: hook.created_at ?? undefined,
  updatedAt: hook.updated_at ?? undefined
});

let hookTypeOutputSchema = z.object({
  name: z.string().describe('Hook type name'),
  events: z.array(z.string()).optional().describe('Events supported by this hook type'),
  fields: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe('Configuration fields required by this hook type')
});

let mapHookType = (hookType: any) => ({
  name: hookType.name || '',
  events: hookType.events ?? undefined,
  fields: hookType.fields ?? undefined
});

export let listHooks = SlateTool.create(spec, {
  name: 'List Notification Hooks',
  key: 'list_hooks',
  description: `List all notification hooks configured for a Netlify site. Hooks can be webhooks, email notifications, or Slack messages triggered by deploy or form submission events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to list hooks for')
    })
  )
  .output(
    z.object({
      hooks: z.array(hookOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let hooks = await client.listHooks(ctx.input.siteId);

    let mapped = hooks.map(mapHook);

    return {
      output: { hooks: mapped },
      message: `Found **${mapped.length}** hook(s) for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let listHookTypes = SlateTool.create(spec, {
  name: 'List Notification Hook Types',
  key: 'list_hook_types',
  description: `List Netlify notification hook types, required fields, and events supported for creating hooks.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      hookTypes: z.array(hookTypeOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let hookTypes = await client.listHookTypes();
    let mapped = hookTypes.map(mapHookType);

    return {
      output: { hookTypes: mapped },
      message: `Found **${mapped.length}** notification hook type(s).`
    };
  })
  .build();

export let createHook = SlateTool.create(spec, {
  name: 'Create Notification Hook',
  key: 'create_hook',
  description: `Create a new notification hook on a Netlify site. Configure webhooks (URL), email, or Slack notifications for deploy and form submission events.`,
  instructions: [
    'For webhook hooks, set hookType to "url" and provide "url" in hookData.',
    'For email hooks, set hookType to "email" and provide "email" in hookData.',
    'For Slack hooks, set hookType to "slack" and provide "url" (Slack webhook URL) in hookData.',
    'Common events: deploy_building, deploy_created, deploy_failed, deploy_locked, deploy_unlocked, submission_created.'
  ]
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to create the hook on'),
      hookType: z.string().describe('Hook type: "url" (webhook), "email", or "slack"'),
      event: z
        .string()
        .describe(
          'Event to trigger the hook (e.g., deploy_building, deploy_created, deploy_failed, submission_created)'
        ),
      hookData: z
        .record(z.string(), z.any())
        .describe(
          'Hook configuration data (e.g., { "url": "https://..." } for webhooks, { "email": "user@example.com" } for email)'
        )
    })
  )
  .output(hookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let hook = await client.createHook({
      site_id: ctx.input.siteId,
      type: ctx.input.hookType,
      event: ctx.input.event,
      data: ctx.input.hookData
    });

    return {
      output: mapHook(hook),
      message: `Created **${ctx.input.hookType}** hook for event **${ctx.input.event}** on site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let updateHook = SlateTool.create(spec, {
  name: 'Update Notification Hook',
  key: 'update_hook',
  description: `Update an existing notification hook. Modify the event type, hook data, or enable/disable the hook.`
})
  .input(
    z.object({
      hookId: z.string().describe('The hook ID to update'),
      event: z.string().optional().describe('New event to trigger the hook'),
      hookData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated hook configuration data'),
      disabled: z
        .boolean()
        .optional()
        .describe('Set to true to disable or false to enable the hook')
    })
  )
  .output(hookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let current = await client.getHook(ctx.input.hookId);

    let body: Record<string, any> = {
      site_id: current.site_id,
      type: current.type,
      event: ctx.input.event ?? current.event,
      data: ctx.input.hookData ?? current.data ?? {}
    };
    if (ctx.input.disabled !== undefined || current.disabled !== undefined) {
      body.disabled = ctx.input.disabled ?? current.disabled;
    }

    let hook = await client.updateHook(ctx.input.hookId, body);

    return {
      output: mapHook(hook),
      message: `Updated hook **${ctx.input.hookId}**.`
    };
  })
  .build();

export let deleteHook = SlateTool.create(spec, {
  name: 'Delete Notification Hook',
  key: 'delete_hook',
  description: `Permanently delete a notification hook from a Netlify site.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      hookId: z.string().describe('The hook ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the hook was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteHook(ctx.input.hookId);

    return {
      output: { deleted: true },
      message: `Deleted hook **${ctx.input.hookId}**.`
    };
  })
  .build();
