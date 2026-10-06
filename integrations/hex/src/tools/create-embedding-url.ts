import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type EmbeddingParams } from '../lib/client';
import { spec } from '../spec';

export let createEmbeddingUrl = SlateTool.create(spec, {
  name: 'Create Embedding URL',
  key: 'create_embedding_url',
  tags: { destructive: true },
  description: `Generate a single-use presigned URL for embedding a Hex app. The URL grants access and must be treated as a credential. Opening it can execute the app unless testMode is enabled.`
})
  .input(
    z.object({
      projectId: z.string().describe('UUID of the project to embed'),
      hexUserAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom user attributes for the embedded session'),
      scope: z
        .array(z.string())
        .optional()
        .describe('EXPORT_PDF and/or EXPORT_CSV. Legacy pdf/csv aliases are accepted.'),
      inputParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Default input parameter values for the embedded app'),
      expiresIn: z
        .number()
        .optional()
        .describe(
          "URL expiration in seconds: greater than 0, at most 300, with millisecond precision. Defaults to the provider's 15 seconds."
        ),
      theme: z
        .string()
        .optional()
        .describe('Theme for the embedded app (e.g. "light", "dark")'),
      showPadding: z
        .boolean()
        .optional()
        .describe('Whether to show padding around the embedded app'),
      showHeader: z
        .boolean()
        .optional()
        .describe(
          'Retained legacy field; the current Hex API does not document it. Omit showHeader.'
        ),
      showEmbeddedRunButton: z
        .boolean()
        .optional()
        .describe('Show the embedded app run button'),
      noEmbedFooter: z.boolean().optional().describe('Hide the Hex-branded footer'),
      testMode: z
        .boolean()
        .optional()
        .describe('Generate a test URL without app execution or embedding usage counts')
    })
  )
  .output(
    z.object({
      embeddingUrl: z.string().describe('Presigned URL for embedding the Hex app')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    });

    let displayOptions: EmbeddingParams['displayOptions'];
    if (
      ctx.input.theme !== undefined ||
      ctx.input.showPadding !== undefined ||
      ctx.input.showHeader !== undefined ||
      ctx.input.showEmbeddedRunButton !== undefined ||
      ctx.input.noEmbedFooter !== undefined
    ) {
      displayOptions = {
        theme: ctx.input.theme,
        showPadding: ctx.input.showPadding,
        showHeader: ctx.input.showHeader,
        showEmbeddedRunButton: ctx.input.showEmbeddedRunButton,
        noEmbedFooter: ctx.input.noEmbedFooter
      };
    }

    let result = await client.createPresignedUrl(ctx.input.projectId, {
      hexUserAttributes: ctx.input.hexUserAttributes,
      scope: ctx.input.scope,
      inputParameters: ctx.input.inputParameters,
      expiresIn: ctx.input.expiresIn,
      displayOptions,
      testMode: ctx.input.testMode
    });

    return {
      output: { embeddingUrl: result.url },
      message: `Generated embedding URL for project ${ctx.input.projectId}.`
    };
  })
  .build();
