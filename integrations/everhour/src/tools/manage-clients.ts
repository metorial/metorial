import { SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let clientSchema = z.object({
  clientId: z.number().describe('Client ID'),
  name: z.string().describe('Client name'),
  projects: z.array(z.string()).optional().describe('Associated project IDs'),
  businessDetails: z.string().optional().describe('Client business details'),
  budget: z.any().optional().describe('Client budget configuration')
});

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `List all clients or search clients by name. Returns client details including associated projects and budget info.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search clients by name')
    })
  )
  .output(
    z.object({
      clients: z.array(clientSchema).describe('List of clients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let clients = await client.listClients(
      ctx.input.query ? { query: ctx.input.query } : undefined
    );
    let mapped = clients.map((c: any) => ({
      clientId: c.id,
      name: c.name,
      projects: c.projects,
      businessDetails: c.businessDetails,
      budget: c.budget
    }));
    return {
      output: { clients: mapped },
      message: `Found **${mapped.length}** client(s).`
    };
  });

export let createClient = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description: `Create a new client in Everhour. Optionally assign projects and set business details.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Client name'),
      projects: z
        .array(z.string())
        .optional()
        .describe('Project IDs to assign to this client'),
      businessDetails: z.string().optional().describe('Business details for the client')
    })
  )
  .output(clientSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let result = await client.createClient(ctx.input);
    return {
      output: {
        clientId: result.id,
        name: result.name,
        projects: result.projects,
        businessDetails: result.businessDetails,
        budget: result.budget
      },
      message: `Created client **${result.name}** (ID: ${result.id}).`
    };
  });

export let updateClient = SlateTool.create(spec, {
  name: 'Update Client',
  key: 'update_client',
  description: `Update an existing client's name, projects, business details, or budget. To set a budget, provide the budget fields. To remove a budget, set removeBudget to true.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to update'),
      name: z.string().optional().describe('New client name'),
      projects: z.array(z.string()).optional().describe('Project IDs to assign'),
      businessDetails: z.string().optional().describe('Business details'),
      budget: z
        .object({
          type: z.enum(['money', 'time', 'costs']).describe('Budget type'),
          budget: z
            .number()
            .describe('Budget amount in cents (money/costs) or seconds (time)'),
          period: z
            .enum(['general', 'monthly', 'weekly', 'daily'])
            .optional()
            .describe('Budget period'),
          appliedFrom: z.string().optional().describe('Budget start date (YYYY-MM-DD)'),
          disallowOverbudget: z.boolean().optional().describe('Prevent going over budget'),
          threshold: z.number().optional().describe('Alert threshold percentage (1-100)')
        })
        .optional()
        .describe('Budget configuration to set'),
      removeBudget: z.boolean().optional().describe('Set to true to remove the budget')
    })
  )
  .output(clientSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let { clientId, budget, removeBudget, ...updateData } = ctx.input;

    let result = await client.updateClient(clientId, updateData);

    if (removeBudget) {
      await client.removeClientBudget(clientId);
      result = await client.getClient(clientId);
    } else if (budget) {
      await client.setClientBudget(clientId, budget);
      result = await client.getClient(clientId);
    }

    return {
      output: {
        clientId: result.id,
        name: result.name,
        projects: result.projects,
        businessDetails: result.businessDetails,
        budget: result.budget
      },
      message: `Updated client **${result.name}**.`
    };
  });

export let deleteClient = SlateTool.create(spec, {
  name: 'Delete Client',
  key: 'delete_client',
  description: `Permanently delete a client from Everhour.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    await client.deleteClient(ctx.input.clientId);
    return {
      output: { success: true },
      message: `Deleted client ${ctx.input.clientId}.`
    };
  });
