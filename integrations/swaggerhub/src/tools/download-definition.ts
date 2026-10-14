import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let downloadDefinition = SlateTool.create(spec, {
  name: 'Download Definition',
  key: 'download_definition',
  description:
    'Download an API or domain definition from SwaggerHub as a YAML or JSON file. API downloads can resolve external references or flatten schemas.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('Owner username or organization. Falls back to the configured owner.'),
      resourceType: z
        .enum(['api', 'domain'])
        .describe('Whether to download an API or a domain'),
      resourceName: z.string().min(1).describe('API or domain name'),
      version: z
        .string()
        .min(1)
        .describe(
          'Version to download. Use get_api_definition or get_domain_definition to list versions.'
        ),
      format: z.enum(['json', 'yaml']).default('yaml').describe('File format'),
      resolved: z
        .boolean()
        .optional()
        .describe('Resolve external references (API downloads only)'),
      flatten: z
        .boolean()
        .optional()
        .describe('Flatten schemas into models (API downloads only)')
    })
  )
  .output(
    z.object({
      owner: z.string(),
      resourceType: z.enum(['api', 'domain']),
      resourceName: z.string(),
      version: z.string(),
      filename: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let owner = ctx.input.owner || ctx.config.owner;
    if (!owner)
      throw createApiServiceError(
        'Owner is required. Provide it in the input or configure a default owner.'
      );
    if (!ctx.auth.token.trim())
      throw createApiServiceError(
        'A SwaggerHub API key is required. Reconnect with an API key.'
      );
    if (
      ctx.input.resourceType === 'domain' &&
      (ctx.input.resolved !== undefined || ctx.input.flatten !== undefined)
    ) {
      throw createApiServiceError(
        'resolved and flatten are supported only for API downloads.'
      );
    }
    let baseUrl = ctx.config.baseUrl.replace(/\/+$/, '');
    let prefix = ctx.input.resourceType === 'api' ? 'apis' : 'domains';
    let filePrefix = ctx.input.resourceType === 'api' ? 'swagger' : 'domain';
    let url = `${baseUrl}/${prefix}/${encodeURIComponent(owner)}/${encodeURIComponent(ctx.input.resourceName)}/${encodeURIComponent(ctx.input.version)}/${filePrefix}.${ctx.input.format}`;
    let mimeType = ctx.input.format === 'yaml' ? 'application/yaml' : 'application/json';
    let filename = `${ctx.input.resourceName}-${ctx.input.version}.${ctx.input.format}`;
    let query: Record<string, string> = {};
    if (ctx.input.resolved !== undefined) query.resolved = String(ctx.input.resolved);
    if (ctx.input.flatten !== undefined) query.flatten = String(ctx.input.flatten);
    await ctx.addAttachment({
      type: 'url',
      url,
      mimeType,
      filename,
      headers: { Authorization: ctx.auth.token, Accept: mimeType },
      query
    });
    return {
      output: {
        owner,
        resourceType: ctx.input.resourceType,
        resourceName: ctx.input.resourceName,
        version: ctx.input.version,
        filename,
        mimeType
      },
      message: `Prepared ${ctx.input.resourceType} **${owner}/${ctx.input.resourceName}** version **${ctx.input.version}** for download in ${ctx.input.format} format.`
    };
  })
  .build();
