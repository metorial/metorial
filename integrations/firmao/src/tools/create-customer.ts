import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer (counterparty) record in Firmao. Supports setting company details, addresses, contact information, NIP number, and custom fields. Duplicate NIP numbers will be rejected.`,
  constraints: ['NIP number must be unique across all customers']
})
  .input(
    z.object({
      name: z.string().describe('Customer/company name'),
      label: z.string().optional().describe('Short label for the customer'),
      customerType: z.string().optional().describe('Customer type (e.g., PARTNER, CLIENT)'),
      nipNumber: z.string().optional().describe('NIP/tax identification number'),
      bankAccountNumber: z.string().optional().describe('Bank account number'),
      emails: z.array(z.string()).optional().describe('Email addresses'),
      phones: z.array(z.string()).optional().describe('Phone numbers'),
      website: z.string().optional().describe('Website URL'),
      description: z.string().optional().describe('Description of the customer'),
      ownership: z.string().optional().describe('Ownership type (e.g., PRIVATE, PUBLIC)'),
      employeesNumber: z.number().optional().describe('Number of employees'),
      industryKey: z.string().optional().describe('Industry key identifier'),
      officeStreet: z.string().optional().describe('Office address street'),
      officeCity: z.string().optional().describe('Office address city'),
      officePostCode: z.string().optional().describe('Office address post code'),
      officeCountry: z.string().optional().describe('Office address country'),
      correspondenceStreet: z.string().optional().describe('Correspondence address street'),
      correspondenceCity: z.string().optional().describe('Correspondence address city'),
      correspondencePostCode: z
        .string()
        .optional()
        .describe('Correspondence address post code'),
      correspondenceCountry: z.string().optional().describe('Correspondence address country'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom fields as key-value pairs (e.g., {"customFields.custom5": "value"})')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('ID of the created customer'),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.label) body.label = ctx.input.label;
    if (ctx.input.customerType) body.customerType = ctx.input.customerType;
    if (ctx.input.nipNumber) body.nipNumber = ctx.input.nipNumber;
    if (ctx.input.bankAccountNumber) body.bankAccountNumber = ctx.input.bankAccountNumber;
    if (ctx.input.emails) body.emails = ctx.input.emails;
    if (ctx.input.phones) body.phones = ctx.input.phones;
    if (ctx.input.website) body.website = ctx.input.website;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.ownership) body.ownership = ctx.input.ownership;
    if (ctx.input.employeesNumber !== undefined)
      body.employeesNumber = ctx.input.employeesNumber;
    if (ctx.input.industryKey) body.industry = { key: ctx.input.industryKey };

    if (
      ctx.input.officeStreet ||
      ctx.input.officeCity ||
      ctx.input.officePostCode ||
      ctx.input.officeCountry
    ) {
      body['officeAddress.street'] = ctx.input.officeStreet;
      body['officeAddress.city'] = ctx.input.officeCity;
      body['officeAddress.postCode'] = ctx.input.officePostCode;
      body['officeAddress.country'] = ctx.input.officeCountry;
    }

    if (
      ctx.input.correspondenceStreet ||
      ctx.input.correspondenceCity ||
      ctx.input.correspondencePostCode ||
      ctx.input.correspondenceCountry
    ) {
      body['correspondenceAddress.street'] = ctx.input.correspondenceStreet;
      body['correspondenceAddress.city'] = ctx.input.correspondenceCity;
      body['correspondenceAddress.postCode'] = ctx.input.correspondencePostCode;
      body['correspondenceAddress.country'] = ctx.input.correspondenceCountry;
    }

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        body[key] = value;
      }
    }

    let result = await client.create('customers', body);

    let createdId = result?.changelog?.[0]?.objectId ?? result?.id ?? result?.data?.id;

    return {
      output: {
        customerId: createdId,
        name: ctx.input.name
      },
      message: `Created customer **${ctx.input.name}** (ID: ${createdId}).`
    };
  })
  .build();
