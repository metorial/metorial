import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listEscalationPolicies = SlateTool.create(spec, {
  name: 'List Escalation Policies',
  key: 'list_escalation_policies',
  description: `List escalation policies configured in Rootly. Escalation policies define how alerts escalate when responders don't acknowledge.
Optionally include escalation levels and paths for full policy details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by keyword'),
      name: z.string().optional().describe('Filter by policy name'),
      include: z
        .string()
        .optional()
        .describe(
          'Include related resources, e.g. "escalation_policy_levels,escalation_policy_paths"'
        ),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      escalationPolicies: z
        .array(z.record(z.string(), z.any()))
        .describe('List of escalation policies'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEscalationPolicies({
      search: ctx.input.search,
      name: ctx.input.name,
      include: ctx.input.include,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let escalationPolicies = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        escalationPolicies,
        totalCount: result.meta?.total_count
      },
      message: `Found **${escalationPolicies.length}** escalation policies.`
    };
  })
  .build();
