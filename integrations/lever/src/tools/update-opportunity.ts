import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid, type Row, row, stringList, unexpected } from '../lib/contracts';
import { spec } from '../spec';

export let updateOpportunityTool = SlateTool.create(spec, {
  name: 'Update Opportunity',
  key: 'update_opportunity',
  description: `Update an opportunity in Lever. Supports changing pipeline stage, archiving/unarchiving, managing tags, links, and sources. Multiple updates can be performed in a single call.`,
  instructions: [
    'To archive, set archived to true and provide archiveReasonId from get_pipeline_metadata.',
    'To unarchive, set archived to false.',
    'Tags, links, and sources support both adding and removing in the same call.'
  ]
})
  .input(
    z.object({
      opportunityId: z.string().describe('ID of the opportunity to update'),
      stageId: z.string().optional().describe('Move to this pipeline stage ID'),
      archived: z.boolean().optional().describe('Set to true to archive, false to unarchive'),
      archiveReasonId: z
        .string()
        .optional()
        .describe('Archive reason ID (only when archiving)'),
      addTags: z.array(z.string()).optional().describe('Tags to add'),
      removeTags: z.array(z.string()).optional().describe('Tags to remove'),
      addLinks: z.array(z.string()).optional().describe('Links to add'),
      removeLinks: z.array(z.string()).optional().describe('Links to remove'),
      addSources: z.array(z.string()).optional().describe('Sources to add'),
      removeSources: z.array(z.string()).optional().describe('Sources to remove')
    })
  )
  .output(
    z.object({
      opportunityId: z.string().describe('ID of the updated opportunity'),
      updatesApplied: z.array(z.string()).describe('List of updates that were applied')
    })
  )
  .handleInvocation(async ctx => {
    const opportunityId = id(ctx.input.opportunityId, 'Opportunity ID');
    if (ctx.input.stageId !== undefined)
      id(ctx.input.stageId, 'Stage ID; discover it with get_pipeline_metadata');
    if (ctx.input.archived === true)
      id(
        ctx.input.archiveReasonId,
        'Archive reason ID required when archiving; discover it with get_pipeline_metadata'
      );
    if (ctx.input.archiveReasonId !== undefined && ctx.input.archived !== true)
      invalid('Archive reason may only be supplied when archived is true.');
    const operations: {
      kind: 'tags' | 'links' | 'sources';
      add: string[];
      remove: string[];
    }[] = [];
    for (const [kind, addKey, removeKey] of [
      ['tags', 'addTags', 'removeTags'],
      ['links', 'addLinks', 'removeLinks'],
      ['sources', 'addSources', 'removeSources']
    ] as const) {
      const add = ctx.input[addKey] === undefined ? [] : stringList(ctx.input[addKey], addKey);
      const remove =
        ctx.input[removeKey] === undefined ? [] : stringList(ctx.input[removeKey], removeKey);
      if (add.some(value => remove.includes(value)))
        invalid('The same value cannot be added and removed in one update.');
      operations.push({ kind, add, remove });
    }
    if (
      ctx.input.stageId === undefined &&
      ctx.input.archived === undefined &&
      !operations.some(operation => operation.add.length || operation.remove.length)
    )
      invalid('Provide at least one opportunity change.');
    const client = new Client(ctx.auth);
    await client.getOpportunity(opportunityId);
    const updatesApplied: string[] = [];
    if (ctx.input.stageId !== undefined) {
      await client.updateOpportunityStage(opportunityId, ctx.input.stageId);
      updatesApplied.push('stage changed');
    }
    if (ctx.input.archived === true) {
      await client.updateOpportunityArchived(opportunityId, ctx.input.archiveReasonId);
      updatesApplied.push('archived');
    } else if (ctx.input.archived === false) {
      await client.deleteOpportunityArchived(opportunityId);
      updatesApplied.push('unarchived');
    }
    for (const operation of operations) {
      const add =
        operation.kind === 'tags'
          ? client.addOpportunityTags.bind(client)
          : operation.kind === 'links'
            ? client.addOpportunityLinks.bind(client)
            : client.addOpportunitySources.bind(client);
      const remove =
        operation.kind === 'tags'
          ? client.removeOpportunityTags.bind(client)
          : operation.kind === 'links'
            ? client.removeOpportunityLinks.bind(client)
            : client.removeOpportunitySources.bind(client);
      if (operation.add.length) {
        await add(opportunityId, operation.add);
        updatesApplied.push(`added ${operation.add.length} ${operation.kind}`);
      }
      if (operation.remove.length) {
        await remove(opportunityId, operation.remove);
        updatesApplied.push(`removed ${operation.remove.length} ${operation.kind}`);
      }
    }
    const after: Row = (await client.getOpportunity(opportunityId)).data;
    if (ctx.input.stageId !== undefined && after.stage !== ctx.input.stageId) unexpected();
    if (
      ctx.input.archived === true &&
      (!after.archived || row(after.archived).reason !== ctx.input.archiveReasonId)
    )
      unexpected();
    if (ctx.input.archived === false && after.archived !== null) unexpected();
    for (const operation of operations)
      if (operation.add.length || operation.remove.length) {
        const values = stringList(after[operation.kind], `Returned ${operation.kind}`);
        if (
          operation.add.some(value => !values.includes(value)) ||
          operation.remove.some(value => values.includes(value))
        )
          unexpected();
      }
    return {
      output: { opportunityId, updatesApplied },
      message: `Updated opportunity ${opportunityId}. Multiple changes are sequential; this operation is not atomic.`
    };
  })
  .build();
