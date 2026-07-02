import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createVendor = SlateTool.create(spec, {
  name: 'Create Vendor',
  key: 'create_vendor',
  description: `Creates a new vendor in MaintainX. Vendors supply parts and services and can be linked to purchase orders and assets.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Vendor name'),
      email: z.string().optional().describe('Contact email address'),
      phone: z.string().optional().describe('Contact phone number'),
      address: z.string().optional().describe('Vendor address'),
      website: z.string().optional().describe('Vendor website URL')
    })
  )
  .output(
    z.object({
      vendorId: z.number().describe('ID of the created vendor'),
      name: z.string().describe('Vendor name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createVendor({
      name: ctx.input.name,
      email: ctx.input.email,
      phone: ctx.input.phone,
      address: ctx.input.address,
      website: ctx.input.website
    });

    let vendorId = result.id ?? result.vendor?.id;

    return {
      output: {
        vendorId,
        name: ctx.input.name
      },
      message: `Created vendor **"${ctx.input.name}"** (ID: ${vendorId}).`
    };
  })
  .build();
