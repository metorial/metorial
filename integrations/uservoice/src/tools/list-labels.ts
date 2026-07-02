import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let labelSchema = z.object({
  labelId: z.number().describe('Unique ID of the label'),
  name: z.string().describe('Short name of the label'),
  fullName: z.string().nullable().describe('Full hierarchical name including parent labels'),
  level: z.number().nullable().describe('Nesting level in label hierarchy'),
  openSuggestionsCount: z.number().describe('Number of open suggestions with this label'),
  createdAt: z.string().describe('When the label was created'),
  updatedAt: z.string().describe('When the label was last updated')
});

export let listLabels = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description: `List all labels available for organizing suggestions internally. Labels are used by admins to categorize and tag suggestions. Returns label IDs for use with suggestion creation and updates.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      labels: z.array(labelSchema),
      totalRecords: z.number().describe('Total number of labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listLabels({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let labels = result.labels.map((l: any) => ({
      labelId: l.id,
      name: l.name,
      fullName: l.full_name || null,
      level: l.level ?? null,
      openSuggestionsCount: l.open_suggestions_count || 0,
      createdAt: l.created_at,
      updatedAt: l.updated_at
    }));

    return {
      output: {
        labels,
        totalRecords: result.pagination?.totalRecords || labels.length
      },
      message: `Found **${labels.length}** labels.`
    };
  })
  .build();
