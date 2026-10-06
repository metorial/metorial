import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { privateReceipt } from '../lib/http';
import { dataset, invalid, type nativeHook, opaqueId, projectId } from '../lib/schemas';
import { spec } from '../spec';

export const publicHook = (
  hook: z.output<typeof nativeHook>,
  token: string,
  additional: string[] = []
) => {
  const { secret: _, headers: __, ...safe } = hook;
  const result = {
    ...safe,
    webhookId: hook.id,
    isDisabled: hook.isDisabled ?? hook.isDisabledByUser
  };
  privateReceipt(token, additional)(result);
  return result;
};
export const manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description:
    'List, read, create, or delete GROQ-powered document webhooks in an accessible project. Creating a hook can deliver content to its receiver when content changes. Deletion does not erase previously delivered events, queued attempts, or external records.',
  instructions: [
    'Call list_projects and manage_datasets to discover scope. Creation requires a webhookName and targetUrl.',
    'Use get with webhookId for exact native readback. Signature secrets and custom header values are not returned.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      projectId: projectId.optional(),
      dataset: dataset.optional(),
      action: z.enum(['list', 'create', 'delete', 'get']).describe('Operation to perform.'),
      webhookId: opaqueId
        .optional()
        .describe('Required for get/delete. Discover IDs with manage_webhooks action list.'),
      webhookName: z.string().min(1).optional().describe('Required for create.'),
      targetUrl: z.string().optional().describe('HTTPS receiver URL, required for create.'),
      targetDataset: z.string().optional(),
      rule: z
        .object({
          on: z.array(z.enum(['create', 'update', 'delete'])).optional(),
          filter: z.string().optional(),
          projection: z.string().optional()
        })
        .optional(),
      httpMethod: z.enum(['POST', 'PUT', 'PATCH', 'DELETE', 'GET']).optional(),
      secret: z
        .string()
        .optional()
        .describe('Create-only signature secret. Not returned in tool results.'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Create-only outgoing request headers. Values are not returned.'),
      includeDrafts: z.boolean().optional()
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z
            .object({
              webhookId: z.string(),
              name: z.string().optional(),
              url: z.string().optional(),
              dataset: z.string().optional(),
              isDisabled: z.boolean().optional()
            })
            .passthrough()
        )
        .optional(),
      created: z.unknown().optional(),
      deleted: z.boolean().optional(),
      webhook: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    const i = ctx.input;
    const c = clientFor(ctx);
    const creation = [
      'webhookName',
      'targetUrl',
      'targetDataset',
      'rule',
      'httpMethod',
      'secret',
      'customHeaders',
      'includeDrafts'
    ] as const;
    if (i.action !== 'create' && creation.some(key => i[key] !== undefined))
      throw invalid('Creation fields apply only to action create.');
    if (
      (i.action === 'list' && i.webhookId !== undefined) ||
      (i.action === 'create' && i.webhookId !== undefined)
    )
      throw invalid('webhookId applies only to get or delete.');
    if (i.action === 'list') {
      const webhooks = (await c.listWebhooks()).map(hook => publicHook(hook, ctx.auth.token));
      return { output: { webhooks }, message: 'Retrieved native webhook discovery.' };
    }
    if (i.action === 'get') {
      if (!i.webhookId) throw invalid('Provide webhookId for get.');
      return {
        output: { webhook: publicHook(await c.getWebhook(i.webhookId), ctx.auth.token) },
        message: 'Retrieved the exact webhook.'
      };
    }
    if (i.action === 'delete') {
      if (!i.webhookId) throw invalid('Provide webhookId for delete.');
      await c.deleteWebhook(i.webhookId);
      return {
        output: { deleted: true },
        message:
          'Native deletion was accepted and the hook is absent or natively marked deleted. Prior deliveries and queued effects may remain.'
      };
    }
    if (!i.webhookName || !i.targetUrl)
      throw invalid('Provide webhookName and targetUrl for create.');
    let url: URL;
    try {
      url = new URL(i.targetUrl);
    } catch {
      throw invalid('Provide an absolute HTTPS webhook receiver URL.');
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash)
      throw invalid('Use an HTTPS receiver without embedded credentials or a fragment.');
    if (
      i.targetDataset !== undefined &&
      i.targetDataset !== '*' &&
      !dataset.safeParse(i.targetDataset).success
    )
      throw invalid('Provide a valid targetDataset or *.');
    if (
      i.customHeaders &&
      Object.entries(i.customHeaders).some(
        ([name, value]) =>
          !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) ||
          Array.from(value).some(char => {
            const n = char.charCodeAt(0);
            return n === 10 || n === 13 || n === 0;
          })
      )
    )
      throw invalid('Provide valid HTTP header names and values without null, CR, or LF.');
    const body = pickDefined({
      type: 'document',
      name: i.webhookName,
      url: i.targetUrl,
      dataset: i.targetDataset ?? c.dataset,
      apiVersion: c.apiVersion,
      rule: i.rule,
      httpMethod: i.httpMethod,
      secret: i.secret,
      headers: i.customHeaders,
      includeDrafts: i.includeDrafts
    });
    const hook = await c.createWebhook(body);
    return {
      output: {
        created: publicHook(hook, ctx.auth.token, [
          i.secret ?? '',
          ...Object.values(i.customHeaders ?? {})
        ])
      },
      message:
        'Created and read back the webhook. Content delivery and notification effects may occur outside this call.'
    };
  })
  .build();
