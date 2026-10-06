import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { createdId, validateInput } from '../lib/contracts';
import { spec } from '../spec';

export let createDashboard = SlateTool.create(spec, {
  name: 'Create Dashboard',
  key: 'create_dashboard',
  description: `Create a new dashboard (tab) in Klipfolio. Optionally assign it to a client account.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new dashboard'),
      description: z.string().optional().describe('Description of the dashboard'),
      clientId: z.string().optional().describe('Client ID to assign the dashboard to')
    })
  )
  .output(
    z.object({
      dashboardId: z.string().optional().describe('ID of the newly created dashboard'),
      location: z.string().optional().describe('Resource location path')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTab({
      name: ctx.input.name,
      description: ctx.input.description,
      clientId: ctx.input.clientId
    });

    let dashboardId = createdId(result, 'tabs');

    return {
      output: {
        dashboardId,
        location: `/tabs/${dashboardId}`
      },
      message: `Created dashboard **${ctx.input.name}**${dashboardId ? ` with ID \`${dashboardId}\`` : ''}.`
    };
  })
  .build();
