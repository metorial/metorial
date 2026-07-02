import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Retrieve workspace details including branding settings and the latest changelog entry. This is a public endpoint.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (uses config workspace if not provided)')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Workspace ID'),
      name: z.string().describe('Workspace name'),
      domain: z.string().describe('Workspace domain'),
      logoUrl: z.string().nullable().describe('Workspace logo URL'),
      customDomain: z.string().nullable().describe('Custom domain'),
      changelogPublic: z.boolean().describe('Whether the changelog is public'),
      latestChangelog: z
        .object({
          changelogId: z.string().describe('Latest changelog ID'),
          title: z.string().describe('Latest changelog title'),
          published: z.boolean().describe('Whether it is published'),
          date: z.string().nullable().describe('Changelog date')
        })
        .nullable()
        .describe('Latest changelog entry')
    })
  )
  .handleInvocation(async ctx => {
    let workspaceId = ctx.input.workspaceId || ctx.config.workspaceId;
    if (!workspaceId) {
      throw new Error(
        'workspaceId is required. Provide it in the input or set it in the config.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.getWorkspace(workspaceId);
    let w = result.workspace || result;

    let latestChangelog = result.latestChangelog
      ? {
          changelogId: result.latestChangelog.id,
          title: result.latestChangelog.title,
          published: result.latestChangelog.published ?? false,
          date: result.latestChangelog.date ?? null
        }
      : null;

    return {
      output: {
        workspaceId: w.id,
        name: w.name,
        domain: w.domain,
        logoUrl: w.logoUrl ?? null,
        customDomain: w.customDomain ?? null,
        changelogPublic: w.changelogPublic ?? false,
        latestChangelog
      },
      message: `Retrieved workspace **${w.name}** (${w.domain}).`
    };
  })
  .build();
