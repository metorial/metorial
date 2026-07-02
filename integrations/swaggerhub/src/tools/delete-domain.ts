import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDomain = SlateTool.create(spec, {
  name: 'Delete Domain',
  key: 'delete_domain',
  description: `Delete a domain or a specific domain version from SwaggerHub. When a version is specified, only that version is removed. When no version is specified, the entire domain and all its versions are deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('Domain owner (username or organization). Falls back to config owner.'),
      domainName: z.string().describe('Name of the domain to delete'),
      version: z
        .string()
        .optional()
        .describe('Specific version to delete. If omitted, the entire domain is deleted.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded'),
      owner: z.string().describe('Domain owner'),
      domainName: z.string().describe('Deleted domain name'),
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
      await client.deleteDomainVersion(owner, ctx.input.domainName, ctx.input.version);
    } else {
      await client.deleteDomain(owner, ctx.input.domainName);
    }

    return {
      output: {
        success: true,
        owner,
        domainName: ctx.input.domainName,
        version: ctx.input.version
      },
      message: ctx.input.version
        ? `Deleted version **${ctx.input.version}** of domain **${owner}/${ctx.input.domainName}**.`
        : `Deleted domain **${owner}/${ctx.input.domainName}** and all its versions.`
    };
  })
  .build();
