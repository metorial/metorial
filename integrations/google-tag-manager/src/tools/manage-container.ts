import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let containerOutputSchema = z.object({
  containerId: z.string().optional().describe('GTM container ID'),
  accountId: z.string().optional().describe('Parent account ID'),
  name: z.string().optional().describe('Container name'),
  publicId: z.string().optional().describe('Container public ID (e.g., GTM-XXXX)'),
  usageContext: z
    .array(z.string())
    .optional()
    .describe('Usage contexts (web, android, ios, amp, server)'),
  domainName: z.array(z.string()).optional().describe('Associated domain names'),
  notes: z.string().optional().describe('Container notes'),
  fingerprint: z.string().optional().describe('Container fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI'),
  snippet: z
    .string()
    .optional()
    .describe('Container tagging snippet (only returned for get with includeSnippet)')
});

export let manageContainer = SlateTool.create(spec, {
  name: 'Manage Container',
  key: 'manage_container',
  description: `Create, retrieve, update, or delete a GTM container. Can also retrieve the container's tagging snippet for website installation.`,
  instructions: [
    'Use action "create" to create a new container under an account.',
    'Use action "get" to retrieve container details. Set includeSnippet to true to also get the installation code snippet.',
    'Use action "update" to modify container properties.',
    'Use action "delete" to permanently remove a container. This is irreversible.',
    'The usageContext determines the container type: "web", "androidSdk5", "iosSdk5", "amp", or "server".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.manageContainer)
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      accountId: z.string().describe('GTM account ID'),
      containerId: z
        .string()
        .optional()
        .describe('Container ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Container name (required for create, optional for update)'),
      usageContext: z
        .array(z.string())
        .optional()
        .describe(
          'Container type contexts, e.g. ["web"] or ["androidSdk5"]. Required for create.'
        ),
      domainName: z.array(z.string()).optional().describe('Domain names for the container'),
      notes: z.string().optional().describe('Container notes'),
      includeSnippet: z
        .boolean()
        .optional()
        .describe('For "get" action: also retrieve the tagging snippet')
    })
  )
  .output(containerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);
    let { action, accountId, containerId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating a container');

      let container = await client.createContainer(accountId, {
        name: ctx.input.name,
        usageContext: ctx.input.usageContext,
        notes: ctx.input.notes,
        domainName: ctx.input.domainName
      });

      return {
        output: container as any,
        message: `Created container **"${container.name}"** (ID: \`${container.containerId}\`, Public ID: \`${container.publicId}\`)`
      };
    }

    if (!containerId)
      throw new Error('containerId is required for get, update, and delete actions');

    if (action === 'get') {
      let container = await client.getContainer(accountId, containerId);
      let output: Record<string, unknown> = { ...container };

      if (ctx.input.includeSnippet) {
        let snippet = await client.getContainerSnippet(accountId, containerId);
        output.snippet = snippet;
      }

      return {
        output: output as any,
        message: `Retrieved container **"${container.name}"** (Public ID: \`${container.publicId}\`)`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.usageContext !== undefined)
        updateData.usageContext = ctx.input.usageContext;
      if (ctx.input.domainName !== undefined) updateData.domainName = ctx.input.domainName;
      if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;

      let container = await client.updateContainer(accountId, containerId, updateData);

      return {
        output: container as any,
        message: `Updated container **"${container.name}"** (ID: \`${container.containerId}\`)`
      };
    }

    // delete
    await client.deleteContainer(accountId, containerId);
    return {
      output: { containerId, accountId } as any,
      message: `Deleted container \`${containerId}\` from account \`${accountId}\``
    };
  })
  .build();
