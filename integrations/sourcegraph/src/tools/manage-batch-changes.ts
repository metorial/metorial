import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let changesetStatsSchema = z.object({
  total: z.number(),
  merged: z.number(),
  open: z.number(),
  closed: z.number(),
  unpublished: z.number(),
  draft: z.number()
});

let batchChangeSchema = z.object({
  batchChangeId: z.string().describe('GraphQL ID of the batch change'),
  name: z.string().describe('Name of the batch change'),
  description: z.string().optional().describe('Description of the batch change'),
  state: z.string().describe('State: OPEN, CLOSED, DRAFT'),
  url: z.string().optional().describe('URL on the Sourcegraph instance'),
  namespace: z.string().optional().describe('Owner namespace (user or org)'),
  creator: z.string().optional().describe('Username of the creator'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  closedAt: z.string().optional(),
  changesetStats: changesetStatsSchema.optional().describe('Statistics about changesets')
});

export let listBatchChanges = SlateTool.create(spec, {
  name: 'List Batch Changes',
  key: 'list_batch_changes',
  description: `List batch changes on the Sourcegraph instance. Batch changes are large-scale code changes that create pull requests across many repositories.
Returns batch change metadata and changeset statistics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      state: z
        .enum(['OPEN', 'CLOSED', 'DRAFT'])
        .optional()
        .describe('Filter by batch change state'),
      first: z.number().optional().describe('Number of batch changes to return (default 50)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      batchChanges: z.array(batchChangeSchema),
      totalCount: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let data = await client.listBatchChanges({
      state: ctx.input.state,
      first: ctx.input.first,
      after: ctx.input.after
    });

    let bc = data.batchChanges;
    let batchChanges = (bc.nodes || []).map((n: any) => ({
      batchChangeId: n.id,
      name: n.name,
      description: n.description || undefined,
      state: n.state,
      url: n.url || undefined,
      namespace: n.namespace?.username || n.namespace?.name || undefined,
      creator: n.creator?.username || undefined,
      createdAt: n.createdAt || undefined,
      updatedAt: n.updatedAt || undefined,
      closedAt: n.closedAt || undefined,
      changesetStats: n.changesetsStats || undefined
    }));

    return {
      output: {
        batchChanges,
        totalCount: bc.totalCount || 0,
        hasNextPage: bc.pageInfo?.hasNextPage || false,
        endCursor: bc.pageInfo?.endCursor || undefined
      },
      message: `Found **${bc.totalCount}** batch changes${ctx.input.state ? ` with state ${ctx.input.state}` : ''}. Showing ${batchChanges.length}.`
    };
  })
  .build();

export let getBatchChange = SlateTool.create(spec, {
  name: 'Get Batch Change',
  key: 'get_batch_change',
  description: `Get detailed information about a specific batch change including its changesets (pull requests/merge requests).
Returns the batch change metadata, changeset statistics, and a list of associated changesets with their status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      batchChangeId: z.string().describe('GraphQL ID of the batch change')
    })
  )
  .output(
    z.object({
      batchChangeId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      state: z.string(),
      url: z.string().optional(),
      namespace: z.string().optional(),
      creator: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      closedAt: z.string().optional(),
      changesetStats: changesetStatsSchema.optional(),
      changesets: z
        .array(
          z.object({
            changesetId: z.string(),
            state: z.string(),
            externalId: z.string().optional(),
            title: z.string().optional(),
            body: z.string().optional(),
            reviewState: z.string().optional(),
            checkState: z.string().optional(),
            repositoryName: z.string().optional(),
            externalUrl: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      changesetCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let data = await client.getBatchChange(ctx.input.batchChangeId);
    let bc = data.node;

    if (!bc) {
      throw new Error(`Batch change not found: ${ctx.input.batchChangeId}`);
    }

    let changesets = (bc.changesets?.nodes || []).map((cs: any) => ({
      changesetId: cs.id,
      state: cs.state,
      externalId: cs.externalID || undefined,
      title: cs.title || undefined,
      body: cs.body || undefined,
      reviewState: cs.reviewState || undefined,
      checkState: cs.checkState || undefined,
      repositoryName: cs.repository?.name || undefined,
      externalUrl: cs.externalURL?.url || undefined,
      createdAt: cs.createdAt || undefined,
      updatedAt: cs.updatedAt || undefined
    }));

    return {
      output: {
        batchChangeId: bc.id,
        name: bc.name,
        description: bc.description || undefined,
        state: bc.state,
        url: bc.url || undefined,
        namespace: bc.namespace?.username || bc.namespace?.name || undefined,
        creator: bc.creator?.username || undefined,
        createdAt: bc.createdAt || undefined,
        updatedAt: bc.updatedAt || undefined,
        closedAt: bc.closedAt || undefined,
        changesetStats: bc.changesetsStats || undefined,
        changesets,
        changesetCount: bc.changesets?.totalCount
      },
      message: `Batch change **${bc.name}** (${bc.state}) — ${bc.changesetsStats?.total || 0} changesets: ${bc.changesetsStats?.merged || 0} merged, ${bc.changesetsStats?.open || 0} open, ${bc.changesetsStats?.closed || 0} closed.`
    };
  })
  .build();

export let closeBatchChange = SlateTool.create(spec, {
  name: 'Close Batch Change',
  key: 'close_batch_change',
  description: `Close a batch change. Optionally close all associated changesets (pull requests) on the code host as well.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      batchChangeId: z.string().describe('GraphQL ID of the batch change to close'),
      closeChangesets: z
        .boolean()
        .optional()
        .describe('Also close all associated changesets on the code host. Defaults to false.')
    })
  )
  .output(
    z.object({
      batchChangeId: z.string(),
      name: z.string(),
      state: z.string(),
      closedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let data = await client.closeBatchChange(
      ctx.input.batchChangeId,
      ctx.input.closeChangesets || false
    );
    let bc = data.closeBatchChange;

    return {
      output: {
        batchChangeId: bc.id,
        name: bc.name,
        state: bc.state,
        closedAt: bc.closedAt || undefined
      },
      message: `Closed batch change **${bc.name}**${ctx.input.closeChangesets ? ' and all associated changesets' : ''}.`
    };
  })
  .build();
