import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let listVariableGroups = SlateTool.create(spec, {
  name: 'List Variable Groups',
  key: 'list_variable_groups',
  description:
    'List environment variable groups for an application, including IDs usable with add_variables. Call list_applications to discover application IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      appId: z
        .string()
        .describe('Application ID. Call list_applications to discover application IDs.'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number, starting at 1 (default 1)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page, from 1 to 100 (default 30)')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          variableGroupId: z.string().describe('Variable group ID'),
          name: z.string().describe('Variable group name')
        })
      ),
      pageSize: z.number().describe('Results per page'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });
    let result = await client.listVariableGroups(
      ctx.input.appId,
      ctx.input.page,
      ctx.input.pageSize
    );
    return {
      output: {
        groups: result.data.map(group => ({ variableGroupId: group.id, name: group.name })),
        pageSize: result.page_size,
        currentPage: result.current_page,
        totalPages: result.total_pages
      },
      message: `Retrieved **${result.data.length}** variable group(s) for app \`${ctx.input.appId}\` on page ${result.current_page}.`
    };
  })
  .build();
