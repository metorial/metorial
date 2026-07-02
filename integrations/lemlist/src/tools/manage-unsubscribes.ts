import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUnsubscribes = SlateTool.create(spec, {
  name: 'Manage Unsubscribes',
  key: 'manage_unsubscribes',
  description: `Add or remove emails from the global unsubscribe list, check the unsubscribe status of a specific email, or list all unsubscribed contacts. Used for maintaining compliance and managing opt-outs.`,
  instructions: [
    'Use action "add" to unsubscribe an email, "remove" to re-subscribe, "check" to verify status, or "list" to get all unsubscribes.',
    'The "email" field is required for add, remove, and check actions.'
  ]
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'check', 'list']).describe('Action to perform'),
      email: z
        .string()
        .optional()
        .describe('Email address (required for add, remove, and check actions)'),
      offset: z.number().optional().describe('Pagination offset (for list action)'),
      limit: z.number().optional().describe('Number of results (for list action, max 100)')
    })
  )
  .output(
    z.object({
      email: z.string().optional(),
      unsubscribed: z.boolean().optional(),
      source: z.string().optional(),
      createdAt: z.string().optional(),
      unsubscribes: z
        .array(
          z.object({
            email: z.string().optional(),
            campaignId: z.string().optional(),
            campaignName: z.string().optional(),
            unsubscribedAt: z.string().optional(),
            scope: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, email } = ctx.input;

    if (action === 'list') {
      let data = await client.listUnsubscribes({
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });

      let unsubscribes = (Array.isArray(data) ? data : []).map((u: any) => ({
        email: u.email ?? u.value,
        campaignId: u.campaignId,
        campaignName: u.campaignName,
        unsubscribedAt: u.unsubscribedAt ?? u.createdAt,
        scope: u.scope
      }));

      return {
        output: { unsubscribes },
        message: `Found **${unsubscribes.length}** unsubscribed contact(s).`
      };
    }

    if (!email) {
      throw new Error('Email is required for add, remove, and check actions.');
    }

    if (action === 'check') {
      try {
        let data = await client.getUnsubscribeStatus(email);
        return {
          output: {
            email: data.value ?? email,
            unsubscribed: true,
            source: data.source,
            createdAt: data.createdAt
          },
          message: `**${email}** is unsubscribed (source: ${data.source ?? 'unknown'}).`
        };
      } catch (e: any) {
        if (e?.response?.status === 404 || e?.status === 404) {
          return {
            output: {
              email,
              unsubscribed: false
            },
            message: `**${email}** is **not** unsubscribed.`
          };
        }
        throw e;
      }
    }

    if (action === 'add') {
      await client.addUnsubscribe(email);
      return {
        output: { email, unsubscribed: true },
        message: `**${email}** has been added to the unsubscribe list.`
      };
    }

    // action === 'remove'
    await client.removeUnsubscribe(email);
    return {
      output: { email, unsubscribed: false },
      message: `**${email}** has been removed from the unsubscribe list.`
    };
  })
  .build();
