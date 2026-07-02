import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { magentoServiceError } from '../lib/errors';
import { spec } from '../spec';

let customerAddressSchema = z.object({
  addressId: z.number().optional().describe('Address ID'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  street: z.array(z.string()).optional().describe('Street address lines'),
  city: z.string().optional().describe('City'),
  regionCode: z.string().optional().describe('Region/state code'),
  postcode: z.string().optional().describe('Postal code'),
  countryId: z.string().optional().describe('Country code (e.g. US, GB)'),
  telephone: z.string().optional().describe('Phone number'),
  company: z.string().optional().describe('Company name'),
  defaultShipping: z
    .boolean()
    .optional()
    .describe('Whether this is the default shipping address'),
  defaultBilling: z
    .boolean()
    .optional()
    .describe('Whether this is the default billing address')
});

let customerOutputSchema = z.object({
  customerId: z.number().optional().describe('Customer ID'),
  email: z.string().optional().describe('Customer email'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  middlename: z.string().optional().describe('Middle name'),
  groupId: z.number().optional().describe('Customer group ID'),
  storeId: z.number().optional().describe('Store ID'),
  websiteId: z.number().optional().describe('Website ID'),
  createdAt: z.string().optional().describe('Account creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  addresses: z.array(customerAddressSchema).optional().describe('Customer addresses')
});

let mapCustomer = (c: any) => ({
  customerId: c.id,
  email: c.email,
  firstname: c.firstname,
  lastname: c.lastname,
  middlename: c.middlename,
  groupId: c.group_id,
  storeId: c.store_id,
  websiteId: c.website_id,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
  addresses: c.addresses?.map((a: any) => ({
    addressId: a.id,
    firstname: a.firstname,
    lastname: a.lastname,
    street: a.street,
    city: a.city,
    regionCode: a.region?.region_code,
    postcode: a.postcode,
    countryId: a.country_id,
    telephone: a.telephone,
    company: a.company,
    defaultShipping: a.default_shipping,
    defaultBilling: a.default_billing
  }))
});

export let manageCustomer = SlateTool.create(spec, {
  name: 'Manage Customer',
  key: 'manage_customer',
  description: `Create, update, retrieve, or delete customer accounts in Magento. Manage customer profiles including names, email, group, and addresses.`,
  instructions: [
    'To **get** a customer, provide the customerId.',
    'To **create**, set action to "create" and provide email, firstname, lastname, and websiteId.',
    'To **update**, set action to "update" with the customerId and fields to change.',
    'To **delete**, set action to "delete" with the customerId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Operation to perform'),
      customerId: z
        .number()
        .optional()
        .describe('Customer ID (required for get, update, delete)'),
      email: z.string().optional().describe('Customer email'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      middlename: z.string().optional().describe('Middle name'),
      groupId: z.number().optional().describe('Customer group ID'),
      websiteId: z.number().optional().describe('Website ID (required for create)'),
      storeId: z.number().optional().describe('Store ID'),
      password: z.string().optional().describe('Password (for create action only)'),
      addresses: z.array(customerAddressSchema).optional().describe('Customer addresses')
    })
  )
  .output(
    z.object({
      customer: customerOutputSchema.optional().describe('Customer details'),
      deleted: z.boolean().optional().describe('Whether the customer was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'get') {
      if (!ctx.input.customerId)
        throw magentoServiceError('customerId is required for get action');
      let customer = await client.getCustomer(ctx.input.customerId);
      return {
        output: { customer: mapCustomer(customer) },
        message: `Retrieved customer **${customer.firstname} ${customer.lastname}** (${customer.email}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.customerId)
        throw magentoServiceError('customerId is required for delete action');
      await client.deleteCustomer(ctx.input.customerId);
      return {
        output: { deleted: true },
        message: `Deleted customer \`${ctx.input.customerId}\`.`
      };
    }

    let customerData: Record<string, any> = {};
    if (ctx.input.email !== undefined) customerData.email = ctx.input.email;
    if (ctx.input.firstname !== undefined) customerData.firstname = ctx.input.firstname;
    if (ctx.input.lastname !== undefined) customerData.lastname = ctx.input.lastname;
    if (ctx.input.middlename !== undefined) customerData.middlename = ctx.input.middlename;
    if (ctx.input.groupId !== undefined) customerData.group_id = ctx.input.groupId;
    if (ctx.input.websiteId !== undefined) customerData.website_id = ctx.input.websiteId;
    if (ctx.input.storeId !== undefined) customerData.store_id = ctx.input.storeId;
    if (ctx.input.addresses) {
      customerData.addresses = ctx.input.addresses.map(a => {
        let addr: Record<string, any> = {};
        if (a.addressId !== undefined) addr.id = a.addressId;
        if (a.firstname !== undefined) addr.firstname = a.firstname;
        if (a.lastname !== undefined) addr.lastname = a.lastname;
        if (a.street !== undefined) addr.street = a.street;
        if (a.city !== undefined) addr.city = a.city;
        if (a.regionCode !== undefined) addr.region = { region_code: a.regionCode };
        if (a.postcode !== undefined) addr.postcode = a.postcode;
        if (a.countryId !== undefined) addr.country_id = a.countryId;
        if (a.telephone !== undefined) addr.telephone = a.telephone;
        if (a.company !== undefined) addr.company = a.company;
        if (a.defaultShipping !== undefined) addr.default_shipping = a.defaultShipping;
        if (a.defaultBilling !== undefined) addr.default_billing = a.defaultBilling;
        return addr;
      });
    }

    if (ctx.input.action === 'create') {
      let customer = await client.createCustomer(customerData, ctx.input.password);
      return {
        output: { customer: mapCustomer(customer) },
        message: `Created customer **${customer.firstname} ${customer.lastname}** (ID: ${customer.id}).`
      };
    }

    // update
    if (!ctx.input.customerId)
      throw magentoServiceError('customerId is required for update action');
    customerData.id = ctx.input.customerId;
    let customer = await client.updateCustomer(ctx.input.customerId, customerData);
    return {
      output: { customer: mapCustomer(customer) },
      message: `Updated customer **${customer.firstname} ${customer.lastname}**.`
    };
  })
  .build();
