import { SlateTool } from 'slates';
import { z } from 'zod';
import { administrationSchema, listAdministrations as discover } from '../lib/administrations';
import { checkedOutput } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({ administrations: z.array(administrationSchema) });
export const listAdministrations = SlateTool.create(spec, {
  key: 'list_administrations',
  name: 'List Administrations',
  description:
    'List authorized Moneybird administrations with names, IDs and currency. Choose an administrationId for subsequent operations.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(outputSchema)
  .handleInvocation(async ctx =>
    checkedOutput(outputSchema, async () => {
      const administrations = await discover(ctx.auth.token);
      return {
        output: { administrations },
        message: `Found ${administrations.length} authorized administration(s).`
      };
    })
  )
  .build();
