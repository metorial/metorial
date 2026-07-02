import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let versionHeaderSchema = z.object({
  containerVersionId: z.string().optional().describe('Version ID'),
  accountId: z.string().optional().describe('Parent account ID'),
  containerId: z.string().optional().describe('Parent container ID'),
  name: z.string().optional().describe('Version name'),
  numTags: z.string().optional().describe('Number of tags in this version'),
  numTriggers: z.string().optional().describe('Number of triggers in this version'),
  numVariables: z.string().optional().describe('Number of variables in this version'),
  numCustomTemplates: z.string().optional().describe('Number of custom templates'),
  deleted: z.boolean().optional().describe('Whether the version is deleted')
});

let versionSchema = z.object({
  containerVersionId: z.string().optional().describe('Version ID'),
  accountId: z.string().optional().describe('Parent account ID'),
  containerId: z.string().optional().describe('Parent container ID'),
  name: z.string().optional().describe('Version name'),
  description: z.string().optional().describe('Version description'),
  fingerprint: z.string().optional().describe('Version fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI'),
  deleted: z.boolean().optional().describe('Whether the version is deleted'),
  tagCount: z.number().optional().describe('Number of tags'),
  triggerCount: z.number().optional().describe('Number of triggers'),
  variableCount: z.number().optional().describe('Number of variables')
});

export let manageVersion = SlateTool.create(spec, {
  name: 'Manage Version',
  key: 'manage_version',
  description: `Create, list, get, publish, or delete container versions. Versions are snapshots of a container's configuration. Publishing a version makes it live on your website or app.`,
  instructions: [
    'Use "create" to snapshot the current workspace into a new version.',
    'Use "publish" to make a version live. This deploys the configuration to production.',
    'Use "get_live" to retrieve the currently published version.',
    'Use "list" to see all version headers for a container.',
    'Use "get_latest" to get the most recent version header.'
  ],
  constraints: [
    'Publishing is irreversible in the sense that the version immediately goes live.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.manageVersion)
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'get_live', 'get_latest', 'publish', 'delete'])
        .describe('Operation to perform'),
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      workspaceId: z.string().optional().describe('Workspace ID (required for create)'),
      versionId: z
        .string()
        .optional()
        .describe('Version ID (required for get, publish, delete)'),
      name: z.string().optional().describe('Version name (for create)'),
      notes: z.string().optional().describe('Version notes/description (for create)')
    })
  )
  .output(
    z.object({
      version: versionSchema.optional().describe('Version details'),
      versionHeaders: z
        .array(versionHeaderSchema)
        .optional()
        .describe('List of version headers (for list action)'),
      compilerError: z
        .boolean()
        .optional()
        .describe('Whether a compiler error occurred (for create/publish)'),
      published: z
        .boolean()
        .optional()
        .describe('Whether the version was successfully published')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);
    let { action, accountId, containerId, workspaceId, versionId } = ctx.input;

    if (action === 'create') {
      if (!workspaceId) throw new Error('workspaceId is required for creating a version');

      let result = await client.createVersion(accountId, containerId, workspaceId, {
        name: ctx.input.name,
        notes: ctx.input.notes
      });

      let version = result.containerVersion;
      let tagCount = version?.tag?.length || 0;
      let triggerCount = version?.trigger?.length || 0;
      let variableCount = version?.variable?.length || 0;

      return {
        output: {
          version: version
            ? {
                containerVersionId: version.containerVersionId,
                accountId: version.accountId,
                containerId: version.containerId,
                name: version.name,
                description: version.description,
                fingerprint: version.fingerprint,
                tagManagerUrl: version.tagManagerUrl,
                tagCount,
                triggerCount,
                variableCount
              }
            : undefined,
          compilerError: result.compilerError
        } as any,
        message: result.compilerError
          ? `Created version **"${version?.name || 'Unnamed'}"** (ID: \`${version?.containerVersionId}\`) with **compiler errors**`
          : `Created version **"${version?.name || 'Unnamed'}"** (ID: \`${version?.containerVersionId}\`) with ${tagCount} tag(s), ${triggerCount} trigger(s), ${variableCount} variable(s)`
      };
    }

    if (action === 'list') {
      let response = await client.listVersionHeaders(accountId, containerId);
      let versionHeaders = response.containerVersionHeader || [];
      return {
        output: { versionHeaders } as any,
        message: `Found **${versionHeaders.length}** version(s) for container \`${containerId}\``
      };
    }

    if (action === 'get_live') {
      let version = await client.getLiveVersion(accountId, containerId);
      let tagCount = version.tag?.length || 0;
      let triggerCount = version.trigger?.length || 0;
      let variableCount = version.variable?.length || 0;

      return {
        output: {
          version: {
            containerVersionId: version.containerVersionId,
            accountId: version.accountId,
            containerId: version.containerId,
            name: version.name,
            description: version.description,
            fingerprint: version.fingerprint,
            tagManagerUrl: version.tagManagerUrl,
            tagCount,
            triggerCount,
            variableCount
          }
        } as any,
        message: `Live version: **"${version.name || 'Unnamed'}"** (ID: \`${version.containerVersionId}\`)`
      };
    }

    if (action === 'get_latest') {
      let header = await client.getLatestVersionHeader(accountId, containerId);
      return {
        output: { versionHeaders: [header] } as any,
        message: `Latest version: **"${header.name || 'Unnamed'}"** (ID: \`${header.containerVersionId}\`)`
      };
    }

    if (!versionId)
      throw new Error('versionId is required for get, publish, and delete actions');

    if (action === 'get') {
      let version = await client.getVersion(accountId, containerId, versionId);
      let tagCount = version.tag?.length || 0;
      let triggerCount = version.trigger?.length || 0;
      let variableCount = version.variable?.length || 0;

      return {
        output: {
          version: {
            containerVersionId: version.containerVersionId,
            accountId: version.accountId,
            containerId: version.containerId,
            name: version.name,
            description: version.description,
            fingerprint: version.fingerprint,
            tagManagerUrl: version.tagManagerUrl,
            deleted: version.deleted,
            tagCount,
            triggerCount,
            variableCount
          }
        } as any,
        message: `Retrieved version **"${version.name || 'Unnamed'}"** (ID: \`${version.containerVersionId}\`)`
      };
    }

    if (action === 'publish') {
      let result = await client.publishVersion(accountId, containerId, versionId);
      let version = result.containerVersion;
      return {
        output: {
          version: version
            ? {
                containerVersionId: version.containerVersionId,
                accountId: version.accountId,
                containerId: version.containerId,
                name: version.name,
                description: version.description,
                fingerprint: version.fingerprint,
                tagManagerUrl: version.tagManagerUrl
              }
            : undefined,
          compilerError: result.compilerError,
          published: !result.compilerError
        } as any,
        message: result.compilerError
          ? `Failed to publish version \`${versionId}\` due to **compiler errors**`
          : `Published version **"${version?.name || 'Unnamed'}"** (ID: \`${version?.containerVersionId}\`) — now live`
      };
    }

    // delete
    await client.deleteVersion(accountId, containerId, versionId);
    return {
      output: { version: { containerVersionId: versionId, accountId, containerId } } as any,
      message: `Deleted version \`${versionId}\``
    };
  })
  .build();
