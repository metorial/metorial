import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOpportunityTool = SlateTool.create(spec, {
  name: 'Update Opportunity',
  key: 'update_opportunity',
  description: `Update an opportunity in Lever. Supports changing pipeline stage, archiving/unarchiving, managing tags, links, and sources. Multiple updates can be performed in a single call.`,
  instructions: [
    'To archive, set archived to true and optionally provide archiveReasonId.',
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
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
    let updatesApplied: string[] = [];

    if (ctx.input.stageId) {
      await client.updateOpportunityStage(ctx.input.opportunityId, ctx.input.stageId);
      updatesApplied.push('stage changed');
    }

    if (ctx.input.archived === true) {
      await client.updateOpportunityArchived(
        ctx.input.opportunityId,
        ctx.input.archiveReasonId
      );
      updatesApplied.push('archived');
    } else if (ctx.input.archived === false) {
      await client.deleteOpportunityArchived(ctx.input.opportunityId);
      updatesApplied.push('unarchived');
    }

    if (ctx.input.addTags && ctx.input.addTags.length > 0) {
      await client.addOpportunityTags(ctx.input.opportunityId, ctx.input.addTags);
      updatesApplied.push(`added ${ctx.input.addTags.length} tag(s)`);
    }

    if (ctx.input.removeTags && ctx.input.removeTags.length > 0) {
      await client.removeOpportunityTags(ctx.input.opportunityId, ctx.input.removeTags);
      updatesApplied.push(`removed ${ctx.input.removeTags.length} tag(s)`);
    }

    if (ctx.input.addLinks && ctx.input.addLinks.length > 0) {
      await client.addOpportunityLinks(ctx.input.opportunityId, ctx.input.addLinks);
      updatesApplied.push(`added ${ctx.input.addLinks.length} link(s)`);
    }

    if (ctx.input.removeLinks && ctx.input.removeLinks.length > 0) {
      await client.removeOpportunityLinks(ctx.input.opportunityId, ctx.input.removeLinks);
      updatesApplied.push(`removed ${ctx.input.removeLinks.length} link(s)`);
    }

    if (ctx.input.addSources && ctx.input.addSources.length > 0) {
      await client.addOpportunitySources(ctx.input.opportunityId, ctx.input.addSources);
      updatesApplied.push(`added ${ctx.input.addSources.length} source(s)`);
    }

    if (ctx.input.removeSources && ctx.input.removeSources.length > 0) {
      await client.removeOpportunitySources(ctx.input.opportunityId, ctx.input.removeSources);
      updatesApplied.push(`removed ${ctx.input.removeSources.length} source(s)`);
    }

    return {
      output: {
        opportunityId: ctx.input.opportunityId,
        updatesApplied
      },
      message: `Updated opportunity **${ctx.input.opportunityId}**: ${updatesApplied.join(', ') || 'no changes'}.`
    };
  })
  .build();
