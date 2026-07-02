import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAbuseContact = SlateTool.create(spec, {
  name: 'Get Abuse Contact',
  key: 'get_abuse_contact',
  description: `Retrieve the abuse contact information for an IP address. Returns the network administrator's contact details (email, phone, address) for reporting fraudulent or malicious activities.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().describe('IPv4 or IPv6 address to look up abuse contact for')
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('Name of the abuse contact or organization'),
      email: z.string().optional().describe('Email address for abuse reports'),
      phone: z.string().optional().describe('Phone number of the abuse contact'),
      address: z.string().optional().describe('Postal address of the abuse contact'),
      country: z.string().optional().describe('Country code of the abuse contact'),
      network: z.string().optional().describe('IP network (CIDR) associated with the contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getAbuseContact(ctx.input.ip);

    return {
      output: {
        name: result.name,
        email: result.email,
        phone: result.phone,
        address: result.address,
        country: result.country,
        network: result.network
      },
      message: `Abuse contact for **${ctx.input.ip}**: ${result.name || 'Unknown'}${result.email ? ` (${result.email})` : ''}, network ${result.network || 'N/A'}.`
    };
  })
  .build();
