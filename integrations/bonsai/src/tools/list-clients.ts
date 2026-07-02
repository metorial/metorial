import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Retrieve all client records from Bonsai. Returns contact details including name, email, company, phone, and job title for each client.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      clients: z
        .array(
          z.object({
            clientId: z.string().describe('Client ID'),
            name: z.string().optional().describe('Full name'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email address'),
            companyName: z.string().optional().describe('Company name'),
            phone: z.string().optional().describe('Phone number'),
            jobTitle: z.string().optional().describe('Job title')
          })
        )
        .describe('List of clients'),
      totalCount: z.number().describe('Total number of clients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let clients = await client.listClients();

    return {
      output: {
        clients: clients.map(c => ({
          clientId: c.id,
          name: c.name,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          companyName: c.companyName,
          phone: c.phone,
          jobTitle: c.jobTitle
        })),
        totalCount: clients.length
      },
      message: `Found **${clients.length}** clients.`
    };
  })
  .build();
