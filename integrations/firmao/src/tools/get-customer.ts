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
        label: c.label ?? undefined,
        customerType: c.customerType ?? undefined,
        nipNumber: c.nipNumber ?? undefined,
        bankAccountNumber: c.bankAccountNumber ?? undefined,
        emails: c.emails ?? undefined,
        phones: c.phones ?? undefined,
        website: c.website ?? undefined,
        description: c.description ?? undefined,
        ownership: c.ownership ?? undefined,
        employeesNumber: c.employeesNumber ?? undefined,
        industry: (typeof c.industry === 'object' ? c.industry?.key : c.industry) ?? undefined,
        officeAddress: c.officeAddress
          ? {
              street: c.officeAddress.street ?? undefined,
              city: c.officeAddress.city ?? undefined,
              postCode: c.officeAddress.postCode ?? undefined,
              country: c.officeAddress.country ?? undefined
            }
          : undefined,
        correspondenceAddress: c.correspondenceAddress
          ? {
              street: c.correspondenceAddress.street ?? undefined,
              city: c.correspondenceAddress.city ?? undefined,
              postCode: c.correspondenceAddress.postCode ?? undefined,
              country: c.correspondenceAddress.country ?? undefined
            }
          : undefined,
        tags: c.tags
          ?.map((t: any) => (typeof t === 'string' ? t : (t.name ?? t.label)))
          .filter((tag: unknown) => typeof tag === 'string'),
        customFields: c.customFields ?? undefined,
        creationDate: c.creationDate ?? undefined,
        lastModificationDate: c.lastModificationDate ?? c.lastUpdateDate ?? undefined
      },
      message: `Retrieved customer **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();
