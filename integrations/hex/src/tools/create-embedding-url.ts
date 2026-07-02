import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEmbeddingUrl = SlateTool.create(spec, {
  name: 'Create Embedding URL',
  key: 'create_embedding_url',
  description: `Generate a presigned URL for embedding a Hex app in an external application. Supports custom user attributes, input parameter defaults, display options (theme, padding, headers), export scopes, and configurable URL expiration.`
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
        .describe('Export scopes to enable (e.g. "pdf", "csv")'),
      inputParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Default input parameter values for the embedded app'),
      expiresIn: z.number().optional().describe('URL expiration time in seconds'),
      theme: z
        .string()
        .optional()
        .describe('Theme for the embedded app (e.g. "light", "dark")'),
      showPadding: z
        .boolean()
        .optional()
        .describe('Whether to show padding around the embedded app'),
      showHeader: z.boolean().optional().describe('Whether to show the app header'),
      testMode: z.boolean().optional().describe('If true, generate a URL for test mode')
    })
  )
  .output(
    z.object({
      embeddingUrl: z.string().describe('Presigned URL for embedding the Hex app')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let displayOptions:
      | { theme?: string; showPadding?: boolean; showHeader?: boolean }
      | undefined;
    if (
      ctx.input.theme !== undefined ||
      ctx.input.showPadding !== undefined ||
      ctx.input.showHeader !== undefined
    ) {
      displayOptions = {
        theme: ctx.input.theme,
        showPadding: ctx.input.showPadding,
        showHeader: ctx.input.showHeader
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
