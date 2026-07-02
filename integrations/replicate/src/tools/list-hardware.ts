import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listHardware = SlateTool.create(spec, {
  name: 'List Hardware',
  key: 'list_hardware',
  description: `List available hardware options on Replicate. Use these SKU values when creating models or deployments.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      hardware: z.array(
        z.object({
          hardwareName: z.string().describe('Display name of the hardware'),
          sku: z.string().describe('SKU identifier to use in API calls')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listHardware();

    let hardware = (result || []).map((h: any) => ({
      hardwareName: h.name,
      sku: h.sku
    }));

    return {
      output: { hardware },
      message: `**${hardware.length}** hardware options available: ${hardware.map((h: any) => `${h.hardwareName} (\`${h.sku}\`)`).join(', ')}.`
    };
  })
  .build();
