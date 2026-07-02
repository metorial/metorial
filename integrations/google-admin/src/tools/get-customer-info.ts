import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let getCustomerInfo = SlateTool.create(spec, {
  name: 'Get Customer Info',
  key: 'get_customer_info',
  description: `Retrieve Google Workspace customer account information including the primary domain, customer ID, language, postal address, and admin contact details.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.getCustomerInfo)
  .input(z.object({}))
  .output(
    z.object({
      customerId: z.string().optional(),
      customerDomain: z.string().optional(),
      alternateEmail: z.string().optional(),
      postalAddress: z
        .object({
          contactName: z.string().optional(),
          organizationName: z.string().optional(),
          locality: z.string().optional(),
          region: z.string().optional(),
          postalCode: z.string().optional(),
          countryCode: z.string().optional(),
          addressLine1: z.string().optional(),
          addressLine2: z.string().optional(),
          addressLine3: z.string().optional()
        })
        .optional(),
      phoneNumber: z.string().optional(),
      language: z.string().optional(),
      customerCreationTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    let c = await client.getCustomer();

    return {
      output: {
        customerId: c.id,
        customerDomain: c.customerDomain,
        alternateEmail: c.alternateEmail,
        postalAddress: c.postalAddress
          ? {
              contactName: c.postalAddress.contactName,
              organizationName: c.postalAddress.organizationName,
              locality: c.postalAddress.locality,
              region: c.postalAddress.region,
              postalCode: c.postalAddress.postalCode,
              countryCode: c.postalAddress.countryCode,
              addressLine1: c.postalAddress.addressLine1,
              addressLine2: c.postalAddress.addressLine2,
              addressLine3: c.postalAddress.addressLine3
            }
          : undefined,
        phoneNumber: c.phoneNumber,
        language: c.language,
        customerCreationTime: c.customerCreationTime
      },
      message: `Retrieved customer info for **${c.customerDomain}** (ID: ${c.id}).`
    };
  })
  .build();
