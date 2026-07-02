import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve full details of a specific customer (counterparty) record by ID, including addresses, contact info, bank details, custom fields, and associated groups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('ID of the customer to retrieve')
    })
  )
  .output(
    z.object({
      customerId: z.number(),
      name: z.string(),
      label: z.string().optional(),
      customerType: z.string().optional(),
      nipNumber: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      emails: z.array(z.string()).optional(),
      phones: z.array(z.string()).optional(),
      website: z.string().optional(),
      description: z.string().optional(),
      ownership: z.string().optional(),
      employeesNumber: z.number().optional(),
      industry: z.string().optional(),
      officeAddress: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          postCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional(),
      correspondenceAddress: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          postCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional(),
      tags: z.array(z.string()).optional(),
      customFields: z.record(z.string(), z.string()).optional(),
      creationDate: z.string().optional(),
      lastModificationDate: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let c = await client.getById('customers', ctx.input.customerId);

    return {
      output: {
        customerId: c.id,
        name: c.name,
        label: c.label,
        customerType: c.customerType,
        nipNumber: c.nipNumber,
        bankAccountNumber: c.bankAccountNumber,
        emails: c.emails,
        phones: c.phones,
        website: c.website,
        description: c.description,
        ownership: c.ownership,
        employeesNumber: c.employeesNumber,
        industry: c.industry?.key ?? c.industry,
        officeAddress: c.officeAddress,
        correspondenceAddress: c.correspondenceAddress,
        tags: c.tags?.map((t: any) => t.name ?? t),
        customFields: c.customFields,
        creationDate: c.creationDate,
        lastModificationDate: c.lastModificationDate
      },
      message: `Retrieved customer **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();
