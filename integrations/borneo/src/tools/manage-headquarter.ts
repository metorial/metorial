import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageHeadquarter = SlateTool.create(spec, {
  name: 'Manage Headquarter',
  key: 'manage_headquarter',
  description: `Create or delete headquarter/office location entries. Register organizational office locations with address details for compliance and organizational management.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      headquarterId: z.string().optional().describe('Headquarter ID (required for delete)'),
      name: z.string().optional().describe('Office/headquarter name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      country: z.string().optional().describe('Country')
    })
  )
  .output(
    z
      .object({
        headquarter: z.any().optional().describe('Headquarter record'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, headquarterId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.address || !ctx.input.city || !ctx.input.country) {
          throw new Error(
            'name, address, city, and country are required for creating a headquarter'
          );
        }
        let result = await client.createHeadquarter({
          name: ctx.input.name,
          address: ctx.input.address,
          city: ctx.input.city,
          country: ctx.input.country
        });
        let data = result?.data ?? result;
        return {
          output: { headquarter: data, success: true },
          message: `Headquarter **${ctx.input.name}** created in ${ctx.input.city}, ${ctx.input.country}.`
        };
      }
      case 'delete': {
        if (!headquarterId) throw new Error('headquarterId is required for delete action');
        await client.deleteHeadquarter(headquarterId);
        return {
          output: { success: true },
          message: `Headquarter **${headquarterId}** deleted.`
        };
      }
    }
  })
  .build();
