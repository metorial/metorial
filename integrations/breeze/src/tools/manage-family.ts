import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageFamily = SlateTool.create(spec, {
  name: 'Manage Family',
  key: 'manage_family',
  description: `Create, modify, or dissolve family groupings. Supports creating a new family from a set of people, adding people to an existing family, removing people from their family, and destroying a family (unlinking all members without deleting them).`,
  instructions: [
    'A person can only belong to one family at a time. Adding them to a new family removes them from their previous one.',
    'Destroying a family does not delete the people — it only unlinks their family associations.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'add', 'remove', 'destroy'])
        .describe(
          '"create": form a new family, "add": add people to an existing family, "remove": remove people from their family, "destroy": dissolve a family grouping'
        ),
      personIds: z.array(z.string()).describe('Person IDs to act on'),
      targetPersonId: z
        .string()
        .optional()
        .describe('Required for "add" action: ID of a person already in the target family')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result: unknown;

    switch (ctx.input.action) {
      case 'create':
        result = await client.createFamily(ctx.input.personIds);
        break;
      case 'add':
        if (!ctx.input.targetPersonId) {
          throw new Error('targetPersonId is required for the "add" action');
        }
        result = await client.addToFamily(ctx.input.personIds, ctx.input.targetPersonId);
        break;
      case 'remove':
        result = await client.removeFromFamily(ctx.input.personIds);
        break;
      case 'destroy':
        result = await client.destroyFamily(ctx.input.personIds);
        break;
    }

    let success =
      typeof result === 'object' && result !== null && 'success' in result
        ? (result as { success: boolean }).success
        : true;

    return {
      output: { success },
      message: `Family action **${ctx.input.action}** completed for ${ctx.input.personIds.length} person(s).`
    };
  })
  .build();
