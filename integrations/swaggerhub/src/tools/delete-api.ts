import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteApi = SlateTool.create(spec, {
  name: 'Delete API',
  key: 'delete_api',
  description: `Delete an API or a specific API version from SwaggerHub. When a version is specified, only that version is removed. When no version is specified, the entire API and all its versions are deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('API owner (username or organization). Falls back to config owner.'),
      apiName: z.string().describe('Name of the API to delete'),
      version: z
        .string()
        .optional()
        .describe('Specific version to delete. If omitted, the entire API is deleted.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded'),
      owner: z.string().describe('API owner'),
      apiName: z.string().describe('Deleted API name'),
      version: z
        .string()
        .optional()
        .describe('Deleted version, if specific version was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let owner = ctx.input.owner || ctx.config.owner;
    if (!owner)
      throw new Error(
        'Owner is required. Provide it in the input or configure a default owner.'
      );

    if (ctx.input.version) {
      await client.deleteApiVersion(owner, ctx.input.apiName, ctx.input.version);
    } else {
      await client.deleteApi(owner, ctx.input.apiName);
    }

    return {
      output: {
        success: true,
        owner,
        apiName: ctx.input.apiName,
        version: ctx.input.version
      },
      message: ctx.input.version
        ? `Deleted version **${ctx.input.version}** of API **${owner}/${ctx.input.apiName}**.`
        : `Deleted API **${owner}/${ctx.input.apiName}** and all its versions.`
    };
  })
  .build();
