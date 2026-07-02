import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let installationEventsTrigger = SlateTrigger.create(spec, {
  name: 'Installation Events',
  key: 'installation_events',
  description:
    'Triggers when a Sentry integration is installed or uninstalled by a user. Useful for tracking which organizations have your integration active.'
})
  .input(
    z.object({
      action: z.string().describe('The action (installed, uninstalled)'),
      installationId: z.string().describe('The installation UUID'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      installationId: z.string(),
      organizationSlug: z.string().optional(),
      installerName: z.string().optional(),
      installerEmail: z.string().optional(),
      status: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let action = body.action || 'installed';
      let installation = body.data?.installation || body.data || {};

      return {
        inputs: [
          {
            action,
            installationId: String(installation.uuid || installation.id || ''),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let installation =
        ctx.input.payload?.data?.installation || ctx.input.payload?.data || {};
      let actor = ctx.input.payload?.actor || {};

      return {
        type: `installation.${ctx.input.action}`,
        id: `installation-${ctx.input.installationId}-${ctx.input.action}-${Date.now()}`,
        output: {
          installationId: String(
            installation.uuid || installation.id || ctx.input.installationId
          ),
          organizationSlug: installation.organization?.slug,
          installerName: actor.name,
          installerEmail: actor.email,
          status: installation.status
        }
      };
    }
  })
  .build();
