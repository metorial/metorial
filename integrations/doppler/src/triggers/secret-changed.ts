import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

export let secretChanged = SlateTrigger.create(spec, {
  name: 'Secret Changed',
  key: 'secret_changed',
  description:
    'Triggers when secrets are modified in a Doppler project config. Fires on any secret update, addition, or deletion within the configured project webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of secret change event'),
      project: z
        .object({
          projectId: z.string().optional(),
          slug: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional()
        })
        .describe('Project where secrets changed'),
      config: z.string().optional().describe('Config name where secrets changed'),
      environment: z.string().optional().describe('Environment slug'),
      workplace: z
        .object({
          workplaceId: z.string().optional(),
          name: z.string().optional()
        })
        .optional()
        .describe('Workplace details'),
      rawPayload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      projectSlug: z.string().describe('Project slug where secrets changed'),
      projectName: z.string().optional().describe('Project display name'),
      configName: z.string().optional().describe('Config name where secrets changed'),
      environment: z.string().optional().describe('Environment slug'),
      workplaceName: z.string().optional().describe('Workplace name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DopplerClient({ token: ctx.auth.token });

      // List all projects to register webhooks for each one
      let result = await client.listProjects({ perPage: 100 });
      let registeredWebhooks: Array<{ project: string; webhookSlug: string }> = [];

      for (let project of result.projects) {
        try {
          let webhook = await client.createWebhook(project.slug || project.name, {
            url: ctx.input.webhookBaseUrl,
            enabled: true
          });
          registeredWebhooks.push({
            project: project.slug || project.name,
            webhookSlug: webhook.slug
          });
        } catch (_err) {
          // Skip projects where webhook creation fails (e.g., permissions)
        }
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new DopplerClient({ token: ctx.auth.token });
      let webhooks = (ctx.input.registrationDetails as any)?.webhooks || [];

      for (let entry of webhooks) {
        try {
          await client.deleteWebhook(entry.project, entry.webhookSlug);
        } catch (_err) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.type || 'secret.changed',
            project: {
              projectId: body.project?.id,
              slug: body.project?.slug,
              name: body.project?.name,
              description: body.project?.description
            },
            config: body.config,
            environment: body.environment,
            workplace: body.workplace
              ? {
                  workplaceId: body.workplace.id,
                  name: body.workplace.name
                }
              : undefined,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let projectSlug = ctx.input.project?.slug || ctx.input.project?.name || 'unknown';
      let uniqueId = `${projectSlug}-${ctx.input.config || 'unknown'}-${Date.now()}`;

      return {
        type: 'secret.changed',
        id: uniqueId,
        output: {
          projectSlug,
          projectName: ctx.input.project?.name,
          configName: ctx.input.config,
          environment: ctx.input.environment,
          workplaceName: ctx.input.workplace?.name
        }
      };
    }
  })
  .build();
