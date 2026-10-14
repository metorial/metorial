import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialerClient } from '../lib/client';
import { spec } from '../spec';

export let getDialerAgents = SlateTool.create(spec, {
  name: 'Get Dialer Agents',
  key: 'get_dialer_agents',
  description:
    'List and search Power Dialer agents. Discover agent IDs for filtering call reports and statistics, with contact details and deletion status.',
  instructions: [
    'Requires a Power Dialer API key.',
    'Results are paginated; request subsequent pages when needed.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1 (default 1)'),
      itemsPerPage: z.number().optional().describe('Agents per page (default 100)'),
      searchString: z.string().optional().describe('Search text to filter agents'),
      showDeleted: z.boolean().optional().describe('Include deleted agents when true')
    })
  )
  .output(
    z.object({
      agents: z.array(
        z.object({
          id: z
            .string()
            .optional()
            .describe('Agent ID for call-report and statistics filters'),
          name: z.string().optional().describe('Agent name'),
          shortNumber: z.string().optional().describe('Agent extension'),
          email: z.string().optional().describe('Agent email address'),
          phone: z.string().optional().describe('Agent phone number'),
          accessType: z
            .union([z.string(), z.number()])
            .optional()
            .describe('Provider access level'),
          isDeleted: z
            .union([z.boolean(), z.number()])
            .optional()
            .describe('Deletion status; numeric 0 means active')
        })
      ),
      page: z.number().optional().describe('Current page'),
      pagesCount: z.number().optional().describe('Total pages'),
      totalItems: z.number().optional().describe('Total matching agents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialerClient({ apiKey: ctx.auth.dialerToken ?? '' });
    let result = await client.getAgents(ctx.input);
    let agents = result.agents.map((agent: any) => ({
      id: agent.id?.toString(),
      name: agent.name ?? undefined,
      shortNumber: agent.shortNumber?.toString(),
      email: agent.email ?? undefined,
      phone: agent.phone?.toString(),
      accessType: agent.accessType ?? undefined,
      isDeleted: agent.isDeleted ?? undefined
    }));

    return {
      output: {
        agents,
        page: result.page,
        pagesCount: result.pagesCount,
        totalItems: result.totalItems
      },
      message: `Retrieved **${agents.length}** dialer agents (page ${result.page ?? 1} of ${result.pagesCount ?? 1}).`
    };
  })
  .build();
