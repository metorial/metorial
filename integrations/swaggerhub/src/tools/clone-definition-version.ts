import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cloneDefinitionVersion = SlateTool.create(spec, {
  name: 'Clone Definition Version',
  key: 'clone_definition_version',
  description:
    'Create a new API or domain version by copying an existing SwaggerHub version. Use this to start editing a new version while preserving a published definition.'
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('Owner username or organization. Falls back to the configured owner.'),
      resourceType: z.enum(['api', 'domain']).describe('Whether to clone an API or a domain'),
      resourceName: z.string().min(1).describe('API or domain name'),
      version: z
        .string()
        .min(1)
        .describe(
          'Existing version to copy. Use get_api_definition or get_domain_definition to list versions.'
        ),
      newVersion: z
        .string()
        .min(1)
        .describe('New version identifier. Must not already exist.'),
      isPrivate: z.boolean().optional().describe('Whether the new version should be private')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      owner: z.string(),
      resourceType: z.enum(['api', 'domain']),
      resourceName: z.string(),
      version: z.string().describe('Created version'),
      sourceVersion: z.string().describe('Version that was copied')
    })
  )
  .handleInvocation(async ctx => {
    let owner = ctx.input.owner || ctx.config.owner;
    if (!owner)
      throw createApiServiceError(
        'Owner is required. Provide it in the input or configure a default owner.'
      );
    if (ctx.input.version === ctx.input.newVersion) {
      throw createApiServiceError('newVersion must differ from the source version.');
    }
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    await client.cloneDefinitionVersion(
      ctx.input.resourceType,
      owner,
      ctx.input.resourceName,
      ctx.input.version,
      ctx.input.newVersion,
      ctx.input.isPrivate
    );
    return {
      output: {
        success: true,
        owner,
        resourceType: ctx.input.resourceType,
        resourceName: ctx.input.resourceName,
        version: ctx.input.newVersion,
        sourceVersion: ctx.input.version
      },
      message: `Created ${ctx.input.resourceType} **${owner}/${ctx.input.resourceName}** version **${ctx.input.newVersion}** from **${ctx.input.version}**.`
    };
  })
  .build();
