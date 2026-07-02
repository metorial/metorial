import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageClient = SlateTool.create(spec, {
  name: 'Manage Client',
  key: 'manage_client',
  description: `For agency partners: list, create, delete, or activate/deactivate client accounts. Each client has their own account with separate billing.
- **list** — List all client accounts.
- **create** — Create a new client account.
- **delete** — Delete a client account.
- **activate** — Activate a client account.
- **deactivate** — Deactivate a client account.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'delete', 'activate', 'deactivate'])
        .describe('Operation to perform'),
      clientId: z
        .string()
        .optional()
        .describe('Client ID (required for delete, activate, deactivate)'),
      firstName: z.string().optional().describe('Client first name (for create)'),
      lastName: z.string().optional().describe('Client last name (for create)'),
      company: z.string().optional().describe('Client company name (for create)'),
      email: z.string().optional().describe('Client email (for create)'),
      phoneNumber: z.string().optional().describe('Client phone number (for create)'),
      password: z.string().optional().describe('Client account password (for create)')
    })
  )
  .output(
    z.object({
      clients: z
        .array(
          z.object({
            clientId: z.string().describe('Client ID'),
            name: z.string().optional().describe('Client name'),
            email: z.string().optional().describe('Client email'),
            billedUsers: z.number().optional().describe('Number of billed users'),
            billedNumbers: z.number().optional().describe('Number of billed phone numbers')
          })
        )
        .optional()
        .describe('List of clients'),
      clientId: z.string().optional().describe('ID of the affected client'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listClients();
      let clientsArray = Array.isArray(result)
        ? result
        : (result.clients ?? result.data ?? []);

      let clients = clientsArray.map((c: any) => ({
        clientId: String(c.id),
        name: c.name ?? `${c.fname ?? ''} ${c.lname ?? ''}`.trim(),
        email: c.email,
        billedUsers: c.billed_users,
        billedNumbers: c.billed_numbers
      }));

      return {
        output: { clients },
        message: `Found **${clients.length}** client(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createClient({
        firstName: ctx.input.firstName!,
        lastName: ctx.input.lastName!,
        company: ctx.input.company!,
        email: ctx.input.email!,
        phoneNumber: ctx.input.phoneNumber!,
        password: ctx.input.password!
      });

      return {
        output: {
          clientId: String(result.id),
          success: true
        },
        message: `Client **${ctx.input.firstName} ${ctx.input.lastName}** created successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteClient(ctx.input.clientId!);
      return {
        output: { clientId: ctx.input.clientId, success: true },
        message: `Client **${ctx.input.clientId}** deleted successfully.`
      };
    }

    if (ctx.input.action === 'activate') {
      await client.setClientActive(ctx.input.clientId!, true);
      return {
        output: { clientId: ctx.input.clientId, success: true },
        message: `Client **${ctx.input.clientId}** activated.`
      };
    }

    if (ctx.input.action === 'deactivate') {
      await client.setClientActive(ctx.input.clientId!, false);
      return {
        output: { clientId: ctx.input.clientId, success: true },
        message: `Client **${ctx.input.clientId}** deactivated.`
      };
    }

    return {
      output: { success: false },
      message: `Unknown action: ${ctx.input.action}`
    };
  })
  .build();
