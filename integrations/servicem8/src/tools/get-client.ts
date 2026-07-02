import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getClient = SlateTool.create(spec, {
  name: 'Get Client',
  key: 'get_client',
  description: `Retrieve a single client (company) by UUID, including their address, contact details, and associated contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyUuid: z.string().describe('UUID of the client/company to retrieve'),
      includeContacts: z
        .boolean()
        .optional()
        .describe('Whether to include the list of associated contacts')
    })
  )
  .output(
    z.object({
      companyUuid: z.string().describe('Unique identifier for the client/company'),
      name: z.string().optional().describe('Company name'),
      addressStreet: z.string().optional().describe('Street address'),
      addressCity: z.string().optional().describe('City'),
      addressState: z.string().optional().describe('State/province'),
      addressPostcode: z.string().optional().describe('Postal/zip code'),
      addressCountry: z.string().optional().describe('Country'),
      website: z.string().optional().describe('Company website URL'),
      isIndividual: z.string().optional().describe('Whether this is an individual'),
      faxNumber: z.string().optional().describe('Fax number'),
      billingAttention: z.string().optional().describe('Billing attention line'),
      paymentTerms: z.string().optional().describe('Payment terms'),
      active: z.number().optional().describe('1 = active, 0 = deleted'),
      editDate: z.string().optional().describe('Last modified timestamp'),
      contacts: z
        .array(
          z.object({
            contactUuid: z.string().describe('UUID of the contact'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email address'),
            phone: z.string().optional().describe('Phone number'),
            mobile: z.string().optional().describe('Mobile number')
          })
        )
        .optional()
        .describe('Associated contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let c = await client.getCompany(ctx.input.companyUuid);

    let contacts: any[] | undefined;
    if (ctx.input.includeContacts) {
      let allContacts = await client.listCompanyContacts({
        filter: `company_uuid eq '${ctx.input.companyUuid}'`
      });
      contacts = allContacts.map((ct: any) => ({
        contactUuid: ct.uuid,
        firstName: ct.first,
        lastName: ct.last,
        email: ct.email,
        phone: ct.phone,
        mobile: ct.mobile
      }));
    }

    return {
      output: {
        companyUuid: c.uuid,
        name: c.name,
        addressStreet: c.address_street,
        addressCity: c.address_city,
        addressState: c.address_state,
        addressPostcode: c.address_postcode,
        addressCountry: c.address_country,
        website: c.website,
        isIndividual: c.is_individual,
        faxNumber: c.fax_number,
        billingAttention: c.billing_attention,
        paymentTerms: c.payment_terms,
        active: c.active,
        editDate: c.edit_date,
        contacts
      },
      message: `Retrieved client **${c.name || c.uuid}**${contacts ? ` with ${contacts.length} contact(s)` : ''}.`
    };
  })
  .build();
