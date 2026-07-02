import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let returnAddressSchema = z.object({
  addressId: z.string().describe('Unique ID of the return address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  businessName: z.string().optional().describe('Business name'),
  address1: z.string().optional().describe('Street address line 1'),
  address2: z.string().optional().describe('Street address line 2'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State/province'),
  zip: z.string().optional().describe('Postal/ZIP code'),
  isDefault: z.boolean().optional().describe('Whether this is the default return address')
});

export let listReturnAddresses = SlateTool.create(spec, {
  name: 'List Return Addresses',
  key: 'list_return_addresses',
  description: `Retrieve all saved return (sender) addresses on the account. Use the address ID as returnAddressId when adding orders to the basket.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      addresses: z.array(returnAddressSchema).describe('Saved return addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listReturnAddresses();
    let rawAddresses = result.addresses ?? result.data ?? [];

    let addresses = rawAddresses.map((a: any) => ({
      addressId: String(a.id),
      firstName: a.first_name ?? a.name?.split(' ')[0] ?? undefined,
      lastName: a.last_name ?? undefined,
      businessName: a.business_name ?? undefined,
      address1: a.address1 ?? undefined,
      address2: a.address2 ?? undefined,
      city: a.city ?? undefined,
      state: a.state ?? undefined,
      zip: a.zip ?? undefined,
      isDefault: a.default === 1 || a.default === '1' || a.is_default === true || undefined
    }));

    return {
      output: { addresses },
      message: `Found **${addresses.length}** return addresses.`
    };
  })
  .build();
