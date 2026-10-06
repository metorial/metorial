import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, pageInfo } from '../lib/helpers';
import { limitSchema, pageOutput, selection, skipSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listLocales = SlateTool.create(spec, {
  name: 'List Locales',
  key: 'list_locales',
  description: `List all configured locales in the current environment. Returns locale codes, names, and fallback configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...selection,
      api: z
        .enum(['management', 'delivery', 'preview'])
        .optional()
        .describe(
          'API for legacy token-only connections. Must match the credential type; reconnect if unknown.'
        ),
      limit: limitSchema,
      skip: skipSchema
    })
  )
  .output(
    z.object({
      ...pageOutput,
      locales: z
        .array(
          z.object({
            localeId: z.string().describe('Locale ID.'),
            name: z.string().describe('Locale display name.'),
            code: z.string().describe('Locale code (e.g. "en-US").'),
            fallbackCode: z.string().optional().describe('Fallback locale code.'),
            isDefault: z.boolean().describe('Whether this is the default locale.'),
            optional: z
              .boolean()
              .optional()
              .describe('Whether content in this locale is optional.'),
            contentDeliveryApi: z
              .boolean()
              .optional()
              .describe('Whether enabled for Content Delivery API.'),
            contentManagementApi: z
              .boolean()
              .optional()
              .describe('Whether enabled for Content Management API.')
          })
        )
        .describe('List of locales.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);
    let result = await client.getLocales({ limit: ctx.input.limit, skip: ctx.input.skip });

    let locales = result.items.map((l: any) => ({
      localeId: l.sys?.id,
      name: l.name,
      code: l.code,
      fallbackCode: l.fallbackCode ?? undefined,
      isDefault: l.default,
      optional: l.optional,
      contentDeliveryApi: l.contentDeliveryApi,
      contentManagementApi: l.contentManagementApi
    }));

    return {
      output: { ...pageInfo(result), locales },
      message: `Found **${locales.length}** locales.`
    };
  })
  .build();
