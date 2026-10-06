import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { invalid, protect, url } from '../lib/validation';
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

function mapCapabilities(
  caps: z.infer<typeof capabilitiesSchema>
): Record<string, unknown> | undefined {
  if (caps === undefined) return undefined;
  const result: Record<string, unknown> = {};
  const webhook = (
    value: { address: string; httpMethod?: string } | undefined,
    defaultMethod: string
  ) => {
    if (value === undefined) return undefined;
    const method = value.httpMethod ?? defaultMethod;
    if (!['GET', 'POST'].includes(method))
      throw invalid('Webhook httpMethod must be GET or POST.');
    return { address: url(value.address), http_method: method };
  };
  const webhooks = (items: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(items).filter(([, value]) => value !== undefined));
  if (caps.voice)
    result.voice = {
      webhooks: webhooks({
        answer_url: webhook(caps.voice.webhooks?.answerUrl, 'GET'),
        fallback_answer_url: webhook(caps.voice.webhooks?.fallbackAnswerUrl, 'GET'),
        event_url: webhook(caps.voice.webhooks?.eventUrl, 'POST')
      })
    };
  if (caps.messages)
    result.messages = {
      webhooks: webhooks({
        inbound_url: webhook(caps.messages.webhooks?.inboundUrl, 'POST'),
        status_url: webhook(caps.messages.webhooks?.statusUrl, 'POST')
      })
    };
  if (caps.rtc)
    result.rtc = {
      webhooks: webhooks({ event_url: webhook(caps.rtc.webhooks?.eventUrl, 'POST') })
    };
  if (caps.vbc) result.vbc = {};
  return result;
}

export let manageApplications = SlateTool.create(spec, {
  name: 'Manage Applications',
  key: 'manage_applications',
  description: `Create, list, update, or delete Vonage Applications. Applications are containers for capabilities (Voice, Messages, RTC, VBC) with their own webhook URLs and key pairs.
Uses API key and secret authentication. Creation requires a caller-owned public key; private keys are never returned. Updates preserve omitted native settings without a concurrency guarantee. Deletion is permanent.`,
  instructions: [
    'Use action "list" to see all applications.',
    'Use action "get" to retrieve a specific application.',
    'Use action "create" to make a new application with capabilities.',
    'Use action "update" to modify an existing application.',
    'Use action "delete" to remove an application.',
    'The capabilities object configures selected APIs and webhook URLs. Omitted native settings are preserved on update.',
    'Use publicKey from a saved keypair for create; keep the matching private key securely.',
    'Read the exact application before update and prevent concurrent changes.'
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
      publicKey: z
        .string()
        .optional()
        .describe(
          'RSA public key from a keypair you already saved; required before create. Keep the matching private key securely.'
        ),
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
      totalPages: z.number().optional().describe('Total native pages'),
      page: z.number().optional().describe('Current native page'),
      pageSize: z.number().optional().describe('Native page size'),
      nextPage: z.number().optional().describe('Next page; absent when complete'),
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
    protect(ctx.input, [ctx.auth.apiSecret, ctx.auth.privateKey ?? '']);
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
            ...listResult
          },
          message: `Found **${listResult.totalItems}** application(s). Showing **${listResult.applications.length}** results.`
        };
      }

      case 'get': {
        if (!ctx.input.applicationId) throw invalid('applicationId is required for get');
        let app = await client.getApplication(ctx.input.applicationId);
        return {
          output: { application: app },
          message: `Retrieved application **${app.name}** (\`${app.applicationId}\`)`
        };
      }

      case 'create': {
        if (!ctx.input.name) throw invalid('name is required for create');

        let capabilitiesBody = mapCapabilities(ctx.input.capabilities);
        let created = await client.createApplication({
          name: ctx.input.name,
          publicKey: ctx.input.publicKey,
          capabilities: capabilitiesBody
        });
        return {
          output: { application: created },
          message: `Created application **${created.name}** (\`${created.applicationId}\`)`
        };
      }

      case 'update': {
        if (!ctx.input.applicationId) throw invalid('applicationId is required for update');
        let updated = await client.updateApplication(ctx.input.applicationId, {
          name: ctx.input.name,
          capabilities: mapCapabilities(ctx.input.capabilities)
        });
        return {
          output: { application: updated },
          message: `Updated application **${updated.name}** (\`${updated.applicationId}\`)`
        };
      }

      case 'delete': {
        if (!ctx.input.applicationId) throw invalid('applicationId is required for delete');
        await client.deleteApplication(ctx.input.applicationId);
        return {
          output: { success: true },
          message: `Deleted application \`${ctx.input.applicationId}\``
        };
      }
    }
  })
  .build();
