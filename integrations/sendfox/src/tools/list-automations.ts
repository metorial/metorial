import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAutomations = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description: `Retrieve a paginated list of email automations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      automations: z.array(
        z.object({
          automationId: z.number().describe('Automation ID'),
          name: z.string().optional().describe('Automation name'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      ),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number'),
      total: z.number().describe('Total number of automations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAutomations(ctx.input.page);

    return {
      output: {
        automations: result.data.map((a: any) => ({
          automationId: a.id,
          name: a.name,
          createdAt: a.created_at
        })),
        currentPage: result.current_page,
        lastPage: result.last_page,
        total: result.total
      },
      message: `Retrieved ${result.data.length} automations (page ${result.current_page} of ${result.last_page}, ${result.total} total).`
    };
  })
  .build();
