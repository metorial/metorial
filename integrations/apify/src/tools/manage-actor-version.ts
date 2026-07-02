import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import {
  ensureAtLeastOne,
  jsonObjectSchema,
  paginationInput,
  pickDefined,
  requireString
} from './shared';

let mapVersion = (version: Record<string, any>) => ({
  versionNumber: version.versionNumber,
  actorId: version.actId,
  sourceType: version.sourceType,
  buildTag: version.buildTag,
  envVars: version.envVars,
  createdAt: version.createdAt,
  modifiedAt: version.modifiedAt
});

let versionBody = (input: {
  versionNumber?: string;
  sourceType?: string;
  buildTag?: string;
  envVars?: Record<string, any>;
  sourceFiles?: Record<string, any>[];
  gitRepoUrl?: string;
  tarballUrl?: string;
}) =>
  pickDefined({
    versionNumber: input.versionNumber,
    sourceType: input.sourceType,
    buildTag: input.buildTag,
    envVars: input.envVars,
    sourceFiles: input.sourceFiles,
    gitRepoUrl: input.gitRepoUrl,
    tarballUrl: input.tarballUrl
  });

export let manageActorVersion = SlateTool.create(spec, {
  name: 'Manage Actor Version',
  key: 'manage_actor_version',
  description: `List, get, create, update, or delete Apify Actor versions. Versions hold source metadata used by Actor builds.`,
  instructions: [
    'Use action=list with actorId to inspect versions.',
    'Use action=create with actorId and versionNumber to create a version.',
    'Use action=update with actorId, versionNumber, and source metadata to modify a version.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      actorId: z.string().optional().describe('Actor ID; required for all actions'),
      versionNumber: z
        .string()
        .optional()
        .describe('Actor version number for get/create/update/delete'),
      sourceType: z
        .string()
        .optional()
        .describe('Apify source type, such as SOURCE_FILES or GIT_REPO'),
      buildTag: z.string().optional().describe('Default build tag for this version'),
      envVars: jsonObjectSchema.optional().describe('Environment variables for the version'),
      sourceFiles: z
        .array(jsonObjectSchema)
        .optional()
        .describe('Source files metadata for SOURCE_FILES versions'),
      gitRepoUrl: z.string().optional().describe('Git repository URL for Git-backed versions'),
      tarballUrl: z.string().optional().describe('Tarball URL for tarball-backed versions'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      actorId: z.string().optional(),
      versionNumber: z.string().optional(),
      sourceType: z.string().optional(),
      buildTag: z.string().optional(),
      envVars: z.record(z.string(), z.any()).optional(),
      createdAt: z.string().optional(),
      modifiedAt: z.string().optional(),
      versions: z.array(z.record(z.string(), z.any())).optional(),
      total: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let actorId = requireString(ctx.input.actorId, 'actorId', ctx.input.action);

    if (ctx.input.action === 'list') {
      let result = await client.listActorVersions(actorId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let versions = result.items.map(mapVersion);
      return {
        output: { actorId, versions, total: result.total },
        message: `Found **${result.total}** version(s) for Actor \`${actorId}\`, showing **${versions.length}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let versionNumber = requireString(ctx.input.versionNumber, 'versionNumber', 'get');
      let version = await client.getActorVersion(actorId, versionNumber);
      return {
        output: mapVersion(version),
        message: `Retrieved Actor \`${actorId}\` version \`${versionNumber}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      requireString(ctx.input.versionNumber, 'versionNumber', 'create');
      let body = versionBody(ctx.input);
      let version = await client.createActorVersion(actorId, body);
      return {
        output: mapVersion(version),
        message: `Created Actor \`${actorId}\` version \`${version.versionNumber ?? ctx.input.versionNumber}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      let versionNumber = requireString(ctx.input.versionNumber, 'versionNumber', 'update');
      let body = versionBody({
        ...ctx.input,
        versionNumber: undefined
      });
      ensureAtLeastOne(body, 'update the Actor version');
      let version = await client.updateActorVersion(actorId, versionNumber, body);
      return {
        output: mapVersion(version),
        message: `Updated Actor \`${actorId}\` version \`${versionNumber}\`.`
      };
    }

    let versionNumber = requireString(ctx.input.versionNumber, 'versionNumber', 'delete');
    await client.deleteActorVersion(actorId, versionNumber);
    return {
      output: { actorId, versionNumber, deleted: true },
      message: `Deleted Actor \`${actorId}\` version \`${versionNumber}\`.`
    };
  })
  .build();
