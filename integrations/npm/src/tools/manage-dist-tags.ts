import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import { stringRecord } from '../lib/response';
import { spec } from '../spec';

export let manageDistTags = SlateTool.create(spec, {
  name: 'Manage Dist-Tags',
  key: 'manage_dist_tags',
  description: `List, add, or remove distribution tags on an npm package. Dist-tags are labels that point to specific versions (e.g. "latest", "next", "beta").
Use "list" to see all current tags, "add" to create or update a tag pointing to a version, or "remove" to delete a tag.`,
  instructions: [
    'The "latest" tag is automatically set when publishing and should generally not be removed.',
    'Adding a tag that already exists will update it to point to the new version.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      packageName: z.string().describe('Full package name (e.g. "react" or "@scope/package")'),
      action: z
        .enum(['list', 'add', 'remove'])
        .describe(
          'Action to perform: "list" to view tags, "add" to set a tag, "remove" to delete a tag'
        ),
      otp: z.string().optional().describe('One-time password when required by the account.'),
      tag: z
        .string()
        .optional()
        .describe('Tag name (required for "add" and "remove" actions)'),
      version: z
        .string()
        .optional()
        .describe('Semver version the tag should point to (required for "add" action)')
    })
  )
  .output(
    z.object({
      distTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Current dist-tags after the operation (tag name → version)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NpmRegistryClient({ token: ctx.auth.token || undefined });

    if (ctx.input.action === 'list') {
      let tags = stringRecord(
        await client.getDistTags(ctx.input.packageName),
        'distribution tags'
      );
      let tagEntries = Object.entries(tags);
      return {
        output: { distTags: tags },
        message: `**${ctx.input.packageName}** has **${tagEntries.length}** dist-tag(s): ${tagEntries.map(([t, v]) => `\`${t}\` → ${v}`).join(', ')}.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.tag)
        throw createApiServiceError('Tag name is required for "add" action.');
      if (!ctx.input.version)
        throw createApiServiceError('Version is required for "add" action.');

      await client.addDistTag(
        ctx.input.packageName,
        ctx.input.tag,
        ctx.input.version,
        ctx.input.otp
      );
      let tags = stringRecord(
        await client.getDistTags(ctx.input.packageName),
        'distribution tags'
      );
      return {
        output: { distTags: tags },
        message: `Set dist-tag \`${ctx.input.tag}\` → **${ctx.input.version}** on **${ctx.input.packageName}**.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.tag)
        throw createApiServiceError('Tag name is required for "remove" action.');

      await client.removeDistTag(ctx.input.packageName, ctx.input.tag, ctx.input.otp);
      let tags = stringRecord(
        await client.getDistTags(ctx.input.packageName),
        'distribution tags'
      );
      return {
        output: { distTags: tags },
        message: `Removed dist-tag \`${ctx.input.tag}\` from **${ctx.input.packageName}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
