import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let statusSchema = z.object({
  statusId: z.number().describe('Unique ID of the status'),
  name: z.string().describe('Display name of the status'),
  isOpen: z.boolean().describe('Whether suggestions with this status are considered open'),
  hexColor: z.string().nullable().describe('Color hex code for display'),
  position: z.number().describe('Display order position'),
  allowComments: z
    .boolean()
    .describe('Whether comments are allowed on suggestions with this status'),
  createdAt: z.string().describe('When the status was created'),
  updatedAt: z.string().describe('When the status was last updated')
});

export let listStatuses = SlateTool.create(spec, {
  name: 'List Statuses',
  key: 'list_statuses',
  description: `List all available suggestion statuses configured in your UserVoice account. Statuses define the lifecycle stages of suggestions (e.g., under review, planned, completed). Use the returned status IDs with the **Update Suggestion Status** tool.`,
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
      statuses: z.array(statusSchema),
      totalRecords: z.number().describe('Total number of statuses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listStatuses({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let statuses = result.statuses.map((s: any) => ({
      statusId: s.id,
      name: s.name,
      isOpen: s.is_open ?? true,
      hexColor: s.hex_color || null,
      position: s.position || 0,
      allowComments: s.allow_comments ?? true,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: {
        statuses,
        totalRecords: result.pagination?.totalRecords || statuses.length
      },
      message: `Found **${statuses.length}** statuses: ${statuses.map((s: any) => s.name).join(', ')}.`
    };
  })
  .build();
