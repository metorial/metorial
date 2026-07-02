import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve all customers in the workspace. Returns customer contact details including name, email, phone, address, company name, and associated client contacts. Useful for looking up customer information before creating or linking projects.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.string().describe('Unique customer identifier'),
          firstName: z.string().describe('First name of the customer'),
          lastName: z.string().describe('Last name of the customer'),
          email: z.string().describe('Email address of the customer'),
          phone: z.string().optional().describe('Phone number of the customer'),
          address: z.string().optional().describe('Address of the customer'),
          companyName: z.string().optional().describe('Company name of the customer'),
          clients: z
            .array(
              z.object({
                clientId: z.string().describe('Unique client contact identifier'),
                name: z.string().describe('Name of the client contact'),
                email: z.string().describe('Email of the client contact')
              })
            )
            .describe('Client contacts associated with this customer')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let customers = await client.getCustomers();

    let mapped = (Array.isArray(customers) ? customers : []).map((c: any) => ({
      customerId: c.customerId ?? '',
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      phone: c.phone || undefined,
      address: c.address || undefined,
      companyName: c.companyName || undefined,
      clients: (Array.isArray(c.clients) ? c.clients : []).map((cl: any) => ({
        clientId: cl.clientId ?? '',
        name: cl.name ?? '',
        email: cl.email ?? ''
      }))
    }));

    return {
      output: { customers: mapped },
      message: `Found **${mapped.length}** customer(s) in the workspace.`
    };
  })
  .build();
