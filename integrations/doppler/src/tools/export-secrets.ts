import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { configInput, projectInput } from '../lib/schemas';
import { spec } from '../spec';

let formats = {
  json: { mimeType: 'application/json', extension: 'json' },
  'dotnet-json': { mimeType: 'application/json', extension: 'json' },
  env: { mimeType: 'text/plain', extension: 'env' },
  'env-no-quotes': { mimeType: 'text/plain', extension: 'env' },
  yaml: { mimeType: 'application/yaml', extension: 'yaml' },
  docker: { mimeType: 'text/plain', extension: 'env' }
};

export let exportSecrets = SlateTool.create(spec, {
  key: 'export_secrets',
  name: 'Export Secrets',
  description:
    'Prepare a downloadable file of computed secrets in JSON, ENV, YAML, Docker, or .NET JSON format. Optionally filter secret names or include dynamic secret leases.',
  instructions: [
    'Discover projects with manage_projects and configs with manage_configs.',
    'Including dynamic secrets issues short-lived leases when the export is created.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      project: projectInput,
      config: configInput,
      format: z
        .enum(['json', 'dotnet-json', 'env', 'env-no-quotes', 'yaml', 'docker'])
        .optional()
        .describe('Export format; defaults to JSON'),
      secretNames: z
        .array(z.string())
        .optional()
        .describe('Secret names to include; omit for all secrets'),
      nameTransformer: z
        .enum([
          'camel',
          'upper-camel',
          'lower-snake',
          'tf-var',
          'dotnet',
          'dotnet-env',
          'lower-kebab'
        ])
        .optional()
        .describe('Transform secret names in the exported file'),
      includeDynamicSecrets: z
        .boolean()
        .optional()
        .describe('Issue and include dynamic secret leases; defaults to false'),
      dynamicSecretsTtlSec: z
        .number()
        .optional()
        .describe(
          'Lease TTL in seconds; only valid when includeDynamicSecrets is true. Provider default is 1800.'
        )
    })
  )
  .output(
    z.object({
      project: z.string(),
      config: z.string(),
      format: z.string(),
      filename: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.dynamicSecretsTtlSec !== undefined &&
      (!ctx.input.includeDynamicSecrets ||
        !Number.isInteger(ctx.input.dynamicSecretsTtlSec) ||
        ctx.input.dynamicSecretsTtlSec <= 0)
    ) {
      throw createApiServiceError(
        'dynamicSecretsTtlSec must be a positive integer and requires includeDynamicSecrets to be true.'
      );
    }
    let format = ctx.input.format ?? 'json';
    let { mimeType, extension } = formats[format];
    let filename = `secrets.${extension}`;
    let query: Record<string, string> = {
      project: ctx.input.project,
      config: ctx.input.config,
      format
    };
    if (ctx.input.secretNames !== undefined) query.secrets = ctx.input.secretNames.join(',');
    if (ctx.input.nameTransformer !== undefined)
      query.name_transformer = ctx.input.nameTransformer;
    if (ctx.input.includeDynamicSecrets !== undefined)
      query.include_dynamic_secrets = String(ctx.input.includeDynamicSecrets);
    if (ctx.input.dynamicSecretsTtlSec !== undefined)
      query.dynamic_secrets_ttl_sec = String(ctx.input.dynamicSecretsTtlSec);

    if (ctx.input.includeDynamicSecrets) {
      let content = await new DopplerClient({ token: ctx.auth.token }).downloadExport(query);
      await ctx.addAttachment({
        type: 'content',
        filename,
        mimeType,
        content: new Response(content, { headers: { 'Content-Type': mimeType } })
      });
    } else {
      await ctx.addAttachment({
        type: 'url',
        url: 'https://api.doppler.com/v3/configs/config/secrets/download',
        query,
        headers: { Authorization: `Bearer ${ctx.auth.token}` },
        filename,
        mimeType
      });
    }
    return {
      output: {
        project: ctx.input.project,
        config: ctx.input.config,
        format,
        filename,
        mimeType
      },
      message: `Prepared a ${format} secrets export for **${ctx.input.project}/${ctx.input.config}**.`
    };
  })
  .build();
