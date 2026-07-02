import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

let capabilitiesSchema = z
  .object({
    voice: z
      .object({
        webhooks: z
          .object({
            answerUrl: z
              .object({ address: z.string(), httpMethod: z.string().optional() })
              .optional(),
            fallbackAnswerUrl: z
              .object({ address: z.string(), httpMethod: z.string().optional() })
              .optional(),
            eventUrl: z
              .object({ address: z.string(), httpMethod: z.string().optional() })
              .optional()
          })
          .optional()
      })
      .optional(),
    messages: z
      .object({
        webhooks: z
          .object({
            inboundUrl: z
              .object({ address: z.string(), httpMethod: z.string().optional() })
              .optional(),
            statusUrl: z
              .object({ address: z.string(), httpMethod: z.string().optional() })
              .optional()
          })
          .optional()
      })
      .optional(),
    rtc: z
      .object({
        webhooks: z
          .object({
            eventUrl: z
              .object({ address: z.string(), httpMethod: z.string().optional() })
              .optional()
          })
          .optional()
      })
      .optional(),
    vbc: z.object({}).optional()
  })
  .optional()
  .describe('Application capabilities configuration with webhook URLs');

export let manageApplications = SlateTool.create(spec, {
  name: 'Manage Applications',
  key: 'manage_applications',
  description: `Create, list, update, or delete Vonage Applications. Applications are containers for capabilities (Voice, Messages, RTC, VBC) with their own webhook URLs and key pairs.
Requires the **API Key, Secret & Application JWT** auth method.`,
  instructions: [
    'Use action "list" to see all applications.',
    'Use action "get" to retrieve a specific application.',
    'Use action "create" to make a new application with capabilities.',
    'Use action "update" to modify an existing application.',
    'Use action "delete" to remove an application.',
    'The capabilities object configures which APIs the application uses and their webhook URLs.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      applicationId: z
        .string()
        .optional()
        .describe('Application ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Application name (required for create, optional for update)'),
      capabilities: capabilitiesSchema,
      pageSize: z.number().optional().describe('Results per page for list action'),
      page: z.number().optional().describe('Page number for list action')
    })
  )
  .output(
    z.object({
      totalItems: z.number().optional().describe('Total applications count (list action)'),
      applications: z
        .array(
          z.object({
            applicationId: z.unknown().optional(),
            name: z.unknown().optional(),
            capabilities: z.unknown().optional(),
            keys: z.unknown().optional(),
            createdAt: z.unknown().optional(),
            updatedAt: z.unknown().optional()
          })
        )
        .optional()
        .describe('List of applications'),
      application: z
        .object({
          applicationId: z.unknown().optional(),
          name: z.unknown().optional(),
          capabilities: z.unknown().optional(),
          keys: z.unknown().optional(),
          createdAt: z.unknown().optional(),
          updatedAt: z.unknown().optional()
        })
        .optional()
        .describe('Single application (get/create/update actions)'),
      success: z.boolean().optional().describe('Whether delete succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      applicationId: ctx.auth.applicationId,
      privateKey: ctx.auth.privateKey
    });

    switch (ctx.input.action) {
      case 'list': {
        let listResult = await client.listApplications({
          pageSize: ctx.input.pageSize,
          page: ctx.input.page
        });
        return {
          output: {
            totalItems: listResult.totalItems,
            applications: listResult.applications
          },
          message: `Found **${listResult.totalItems}** application(s). Showing **${listResult.applications.length}** results.`
        };
      }

      case 'get': {
        if (!ctx.input.applicationId) throw new Error('applicationId is required for get');
        let app = await client.getApplication(ctx.input.applicationId);
        return {
          output: { application: app },
          message: `Retrieved application **${app.name}** (\`${app.applicationId}\`)`
        };
      }

      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for create');

        let capabilitiesBody: Record<string, unknown> = {};
        if (ctx.input.capabilities) {
          let caps = ctx.input.capabilities;
          if (caps.voice) {
            capabilitiesBody.voice = {
              webhooks: {
                answer_url: caps.voice.webhooks?.answerUrl
                  ? {
                      address: caps.voice.webhooks.answerUrl.address,
                      http_method: caps.voice.webhooks.answerUrl.httpMethod || 'GET'
                    }
                  : undefined,
                fallback_answer_url: caps.voice.webhooks?.fallbackAnswerUrl
                  ? {
                      address: caps.voice.webhooks.fallbackAnswerUrl.address,
                      http_method: caps.voice.webhooks.fallbackAnswerUrl.httpMethod || 'GET'
                    }
                  : undefined,
                event_url: caps.voice.webhooks?.eventUrl
                  ? {
                      address: caps.voice.webhooks.eventUrl.address,
                      http_method: caps.voice.webhooks.eventUrl.httpMethod || 'POST'
                    }
                  : undefined
              }
            };
          }
          if (caps.messages) {
            capabilitiesBody.messages = {
              webhooks: {
                inbound_url: caps.messages.webhooks?.inboundUrl
                  ? {
                      address: caps.messages.webhooks.inboundUrl.address,
                      http_method: caps.messages.webhooks.inboundUrl.httpMethod || 'POST'
                    }
                  : undefined,
                status_url: caps.messages.webhooks?.statusUrl
                  ? {
                      address: caps.messages.webhooks.statusUrl.address,
                      http_method: caps.messages.webhooks.statusUrl.httpMethod || 'POST'
                    }
                  : undefined
              }
            };
          }
          if (caps.rtc) {
            capabilitiesBody.rtc = {
              webhooks: {
                event_url: caps.rtc.webhooks?.eventUrl
                  ? {
                      address: caps.rtc.webhooks.eventUrl.address,
                      http_method: caps.rtc.webhooks.eventUrl.httpMethod || 'POST'
                    }
                  : undefined
              }
            };
          }
          if (caps.vbc) {
            capabilitiesBody.vbc = {};
          }
        }

        let created = await client.createApplication({
          name: ctx.input.name,
          capabilities: Object.keys(capabilitiesBody).length > 0 ? capabilitiesBody : undefined
        });
        return {
          output: { application: created },
          message: `Created application **${created.name}** (\`${created.applicationId}\`)`
        };
      }

      case 'update': {
        if (!ctx.input.applicationId) throw new Error('applicationId is required for update');
        let updated = await client.updateApplication(ctx.input.applicationId, {
          name: ctx.input.name,
          capabilities: ctx.input.capabilities as Record<string, unknown> | undefined
        });
        return {
          output: { application: updated },
          message: `Updated application **${updated.name}** (\`${updated.applicationId}\`)`
        };
      }

      case 'delete': {
        if (!ctx.input.applicationId) throw new Error('applicationId is required for delete');
        await client.deleteApplication(ctx.input.applicationId);
        return {
          output: { success: true },
          message: `Deleted application \`${ctx.input.applicationId}\``
        };
      }
    }
  })
  .build();
