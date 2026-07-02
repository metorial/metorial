import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createItem = SlateTool.create(spec, {
  name: 'Create Work Item',
  key: 'create_item',
  description: `Creates a new work item (ticket, task, or other configurable item type) in OneDesk.
Use this to submit tickets, create tasks, or add any other type of work item to a project.
Supports setting priority, description, type, and associating the item with a project.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name/title of the work item.'),
      type: z
        .string()
        .optional()
        .describe(
          'Item type identifier (e.g. ticket type or task type). Use "Get Organization Info" to list available item types.'
        ),
      description: z
        .string()
        .optional()
        .describe('Description or details of the work item. Supports HTML.'),
      projectExternalId: z
        .string()
        .optional()
        .describe('External ID of the project to associate this item with.'),
      priority: z
        .number()
        .optional()
        .describe(
          'Priority level (0=No priority, 20=1-star, 40=2-star, 60=3-star, 80=4-star, 100=5-star).'
        )
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the newly created work item.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.createItem({
      name: ctx.input.name,
      type: ctx.input.type,
      description: ctx.input.description,
      projectExternalId: ctx.input.projectExternalId,
      priority: ctx.input.priority
    });

    let itemId =
      typeof result === 'string' ? result : result?.id || result?.externalId || String(result);

    return {
      output: {
        itemId
      },
      message: `Created work item **${ctx.input.name}** with ID \`${itemId}\`.`
    };
  })
  .build();
