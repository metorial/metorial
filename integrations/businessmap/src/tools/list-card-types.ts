import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCardTypesTool = SlateTool.create(spec, {
  name: 'List Card Types',
  key: 'list_card_types',
  description:
    'List card types and their IDs for creating or updating cards. Supply a board ID from list_boards to see types assigned to that board.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      boardId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Board ID from list_boards. Omit to list account-wide card types.')
    })
  )
  .output(
    z.object({
      types: z
        .array(
          z.object({
            typeId: z.number().describe('Card type ID'),
            name: z.string().optional().describe('Card type name'),
            description: z.string().nullable().optional().describe('Type description'),
            color: z
              .string()
              .nullable()
              .optional()
              .describe('Hexadecimal color, or null when no board color is set'),
            availability: z
              .number()
              .optional()
              .describe('Availability: 0=On-demand, 1=Auto, 2=Global'),
            isEnabled: z.number().optional().describe('Whether the type is enabled (0 or 1)')
          })
        )
        .describe('Card types')
    })
  )
  .handleInvocation(async ctx => {
    let types = await new Client(ctx.auth).listCardTypes(ctx.input.boardId);
    return {
      output: {
        types: types.map((type: any) => ({
          typeId: type.type_id,
          name: type.name,
          description: type.description,
          color: type.color,
          availability: type.availability,
          isEnabled: type.is_enabled
        }))
      },
      message: `Found **${types.length}** card type(s).`
    };
  })
  .build();
