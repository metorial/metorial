import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let listNotifications = SlateTool.create(spec, {
  name: 'List Notifications',
  key: 'list_notifications',
  description: `Lists all configured notifications for the Stitch account, including custom email recipients and post-load webhook hooks. Use this to see the current notification setup.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      customEmails: z
        .array(
          z.object({
            emailId: z.number().describe('Notification ID'),
            email: z.string().describe('Email address'),
            disabled: z
              .boolean()
              .describe('Whether notifications are disabled for this email'),
            createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('Custom email notification recipients'),
      hooks: z
        .array(
          z.object({
            hookId: z.number().describe('Hook ID'),
            url: z.string().describe('Webhook URL'),
            disabled: z.boolean().describe('Whether the hook is disabled'),
            createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('Post-load webhook hooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let [rawEmails, rawHooks] = await Promise.all([
      client.listCustomEmails(),
      client.listHooks()
    ]);

    let customEmails = rawEmails.map((e: any) => ({
      emailId: e.id,
      email: e.email,
      disabled: e.disabled ?? false,
      createdAt: e.created_at || null
    }));

    let hooks = rawHooks.map((h: any) => ({
      hookId: h.id,
      url: h.url,
      disabled: h.disabled ?? false,
      createdAt: h.created_at || null
    }));

    return {
      output: { customEmails, hooks },
      message: `Found **${customEmails.length}** email recipient(s) and **${hooks.length}** webhook hook(s).`
    };
  })
  .build();

export let manageCustomEmail = SlateTool.create(spec, {
  name: 'Manage Custom Email',
  key: 'manage_custom_email',
  description: `Create, enable, disable, or delete a custom email notification recipient. Custom emails receive alerts about replication issues and status changes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'enable', 'disable', 'delete']).describe('Action to perform'),
      email: z.string().optional().describe('Email address (required for "create" action)'),
      emailId: z
        .number()
        .optional()
        .describe('Email notification ID (required for enable/disable/delete actions)')
    })
  )
  .output(
    z.object({
      emailId: z.number().nullable().describe('ID of the notification'),
      email: z.string().nullable().describe('Email address'),
      disabled: z.boolean().nullable().describe('Whether notifications are disabled'),
      deleted: z.boolean().optional().describe('Whether the email was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let { action, email, emailId } = ctx.input;

    if (action === 'create') {
      if (!email) throw new Error('Email address is required for create action');
      let result = await client.createCustomEmail(email);
      return {
        output: {
          emailId: result.id,
          email: result.email,
          disabled: result.disabled ?? false
        },
        message: `Created email notification for **${email}**.`
      };
    }

    if (!emailId) throw new Error('emailId is required for enable/disable/delete actions');

    if (action === 'delete') {
      await client.deleteCustomEmail(emailId);
      return {
        output: {
          emailId,
          email: null,
          disabled: null,
          deleted: true
        },
        message: `Deleted email notification **${emailId}**.`
      };
    }

    let disabled = action === 'disable';
    let result = await client.updateCustomEmail(emailId, disabled);
    return {
      output: {
        emailId: result.id || emailId,
        email: result.email || null,
        disabled: result.disabled ?? disabled
      },
      message: `${disabled ? 'Disabled' : 'Enabled'} email notification **${emailId}**.`
    };
  })
  .build();

export let managePostLoadHook = SlateTool.create(spec, {
  name: 'Manage Post-Load Hook',
  key: 'manage_post_load_hook',
  description: `Create, enable, disable, or delete a post-load webhook. Post-load hooks fire each time data is loaded into the destination, allowing you to trigger downstream processing such as SQL transformations, Lambda functions, or other HTTP-based workflows.`,
  constraints: ['A maximum of 10 post-load hooks can be configured per account.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'enable', 'disable', 'delete']).describe('Action to perform'),
      url: z.string().optional().describe('Webhook URL (required for "create" action)'),
      hookId: z
        .number()
        .optional()
        .describe('Hook ID (required for enable/disable/delete actions)')
    })
  )
  .output(
    z.object({
      hookId: z.number().nullable().describe('ID of the hook'),
      url: z.string().nullable().describe('Webhook URL'),
      disabled: z.boolean().nullable().describe('Whether the hook is disabled'),
      deleted: z.boolean().optional().describe('Whether the hook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let { action, url, hookId } = ctx.input;

    if (action === 'create') {
      if (!url) throw new Error('URL is required for create action');
      let result = await client.createHook(url);
      return {
        output: {
          hookId: result.id,
          url: result.url,
          disabled: result.disabled ?? false
        },
        message: `Created post-load hook for **${url}**.`
      };
    }

    if (!hookId) throw new Error('hookId is required for enable/disable/delete actions');

    if (action === 'delete') {
      await client.deleteHook(hookId);
      return {
        output: {
          hookId,
          url: null,
          disabled: null,
          deleted: true
        },
        message: `Deleted post-load hook **${hookId}**.`
      };
    }

    let disabled = action === 'disable';
    let result = await client.updateHook(hookId, disabled);
    return {
      output: {
        hookId: result.id || hookId,
        url: result.url || null,
        disabled: result.disabled ?? disabled
      },
      message: `${disabled ? 'Disabled' : 'Enabled'} post-load hook **${hookId}**.`
    };
  })
  .build();
