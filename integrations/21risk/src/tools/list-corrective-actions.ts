import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let correctiveActionSchema = z
  .object({
    actionId: z.string().optional().describe('Unique identifier of the corrective action'),
    title: z.string().optional().describe('Title of the corrective action'),
    status: z.string().optional().describe('Current status of the action'),
    responsiblePerson: z.string().optional().describe('Person responsible for the action'),
    dueDate: z.string().optional().describe('Due date for the action'),
    costEstimate: z.number().optional().describe('Estimated cost to resolve'),
    siteId: z.string().optional().describe('ID of the associated site'),
    auditId: z.string().optional().describe('ID of the associated audit')
  })
  .passthrough();

export let listCorrectiveActions = SlateTool.create(spec, {
  name: 'List Corrective Actions',
  key: 'list_corrective_actions',
  description: `Retrieve corrective actions from 21RISK. Actions track non-compliance issues and are automatically created when a risk-model category is non-compliant in an audit. Includes responsible person, cost estimates, due dates, and status. Use OData filters to narrow by status, site, or date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('OData $filter expression (e.g., "Status eq \'Open\'")'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      expand: z.string().optional().describe('Related entities to expand'),
      orderby: z.string().optional().describe('Sort order (e.g., "DueDate asc")'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      actions: z.array(correctiveActionSchema).describe('List of corrective actions'),
      count: z.number().describe('Number of corrective actions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let actions = await client.getActions({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = Array.isArray(actions) ? actions : [actions];

    return {
      output: {
        actions: results,
        count: results.length
      },
      message: `Retrieved **${results.length}** corrective action(s).`
    };
  })
  .build();
