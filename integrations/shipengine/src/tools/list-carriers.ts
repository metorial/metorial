import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCarriers = SlateTool.create(spec, {
  name: 'List Carriers',
  key: 'list_carriers',
  description: `List all carrier accounts connected to your ShipEngine account. Returns carrier IDs, codes, names, balance, and capabilities. Optionally include available services and package types for a specific carrier.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      includeServicesForCarrierId: z
        .string()
        .optional()
        .describe('Carrier ID to include detailed services for'),
      includePackagesForCarrierId: z
        .string()
        .optional()
        .describe('Carrier ID to include package types for')
    })
  )
  .output(
    z.object({
      carriers: z.array(
        z.object({
          carrierId: z.string().describe('Carrier ID'),
          carrierCode: z.string().describe('Carrier code (e.g. fedex, ups, usps)'),
          nickname: z.string().describe('Account nickname'),
          friendlyName: z.string().describe('Carrier friendly name'),
          accountNumber: z.string().describe('Account number'),
          balance: z.number().describe('Account balance'),
          primary: z.boolean().describe('Whether this is the primary carrier'),
          requiresFundedAmount: z
            .boolean()
            .describe('Whether the carrier requires funded amount'),
          supportsLabelMessages: z
            .boolean()
            .describe('Whether the carrier supports label messages')
        })
      ),
      services: z
        .array(
          z.object({
            carrierId: z.string().describe('Carrier ID'),
            carrierCode: z.string().describe('Carrier code'),
            serviceCode: z.string().describe('Service code'),
            name: z.string().describe('Service name'),
            domestic: z.boolean().describe('Supports domestic shipments'),
            international: z.boolean().describe('Supports international shipments')
          })
        )
        .optional()
        .describe('Available services for the requested carrier'),
      packageTypes: z
        .array(
          z.object({
            packageCode: z.string().describe('Package code'),
            name: z.string().describe('Package type name'),
            description: z.string().optional().describe('Description')
          })
        )
        .optional()
        .describe('Package types for the requested carrier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let carriersResult = await client.listCarriers();

    let carriers = carriersResult.carriers.map(c => ({
      carrierId: c.carrier_id,
      carrierCode: c.carrier_code,
      nickname: c.nickname,
      friendlyName: c.friendly_name,
      accountNumber: c.account_number,
      balance: c.balance,
      primary: c.primary,
      requiresFundedAmount: c.requires_funded_amount,
      supportsLabelMessages: c.supports_label_messages
    }));

    let services: any;
    if (ctx.input.includeServicesForCarrierId) {
      let servicesResult = await client.listCarrierServices(
        ctx.input.includeServicesForCarrierId
      );
      services = servicesResult.services.map(s => ({
        carrierId: s.carrier_id,
        carrierCode: s.carrier_code,
        serviceCode: s.service_code,
        name: s.name,
        domestic: s.domestic,
        international: s.international
      }));
    }

    let packageTypes: any;
    if (ctx.input.includePackagesForCarrierId) {
      let packagesResult = await client.listCarrierPackageTypes(
        ctx.input.includePackagesForCarrierId
      );
      packageTypes = packagesResult.packages.map(p => ({
        packageCode: p.package_code,
        name: p.name,
        description: p.description
      }));
    }

    return {
      output: { carriers, services, packageTypes },
      message: `Found **${carriers.length}** connected carrier(s): ${carriers.map(c => c.friendlyName).join(', ')}.`
    };
  })
  .build();
