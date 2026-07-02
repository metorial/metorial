import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let capacitySchema = z.object({
  capacityId: z.string().describe('Unique identifier of the capacity'),
  displayName: z.string().describe('Display name of the capacity'),
  sku: z.string().optional().describe('SKU of the capacity'),
  state: z.string().optional().describe('Current state of the capacity'),
  region: z.string().optional().describe('Azure region of the capacity'),
  admins: z.array(z.string()).optional().describe('Capacity administrators')
});

export let listCapacities = SlateTool.create(spec, {
  name: 'List Capacities',
  key: 'list_capacities',
  description: `List available Power BI Premium and Embedded capacities. View capacity names, SKUs, states, regions, and admin assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      capacities: z.array(capacitySchema).describe('List of available capacities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let capacities = await client.listCapacities();

    let mapped = capacities.map((c: any) => ({
      capacityId: c.id,
      displayName: c.displayName,
      sku: c.sku,
      state: c.state,
      region: c.region,
      admins: c.admins
    }));

    return {
      output: { capacities: mapped },
      message: `Found **${mapped.length}** capacity/capacities.`
    };
  })
  .build();
