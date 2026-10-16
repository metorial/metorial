import { z } from 'zod';

export let mailerTypeSchema = z.enum([
  'postcard',
  'postcard6x9',
  'postcard6x11',
  'letter',
  'windowlessletter',
  'notecard',
  'giftcard',
  'magnacard'
]);

export let radiusRecordTypeSchema = z.enum([
  'all',
  'likelytomove',
  'apartmentcomplex',
  'likelytodownsize',
  'likelytorefi',
  'absenteeowner',
  'highnetworth',
  'majorityhomeequity',
  'homefreeclear',
  'underwater',
  'kidsinhousehold',
  'newhomeowner',
  'firsttimehomebuyer',
  'renters',
  'retiring',
  'retired',
  'pool',
  'onlybusinesses',
  'newbusiness'
]);

export let radiusSearchSchema = z
  .object({
    address: z.string().describe('Full center address including city, state and postal code'),
    recordCount: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .describe('Nearby recipients to find (1-10000); lead data incurs fees'),
    recordTypes: radiusRecordTypeSchema
      .exclude(['apartmentcomplex', 'likelytodownsize'])
      .optional(),
    includeCondos: z.boolean().optional(),
    appendData: z.boolean().optional().describe('Append phone/email for an additional fee'),
    usePropertyOwner: z.boolean().optional(),
    includeSearchAddress: z.boolean().optional()
  })
  .describe('Find recipients near an address; purchased lead data incurs fees');

export let mapRadiusSearch = (input: z.infer<typeof radiusSearchSchema> | undefined) =>
  input
    ? {
        address: input.address,
        record_count: input.recordCount,
        record_types: input.recordTypes,
        include_condos: input.includeCondos,
        append_data: input.appendData,
        use_property_owner: input.usePropertyOwner,
        include_search_address: input.includeSearchAddress
      }
    : undefined;

export let recipientFields = {
  name: z.string().optional(),
  company: z.string().optional(),
  address: z
    .string()
    .optional()
    .describe('Street address, or provide email for paid address lookup'),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  email: z
    .string()
    .optional()
    .describe('Email for paid address lookup when no mailing address is supplied'),
  phone: z.string().optional(),
  dob: z.string().optional(),
  anniversary: z.string().optional(),
  custom1: z.string().optional(),
  custom2: z.string().optional(),
  custom3: z.string().optional(),
  custom4: z.string().optional(),
  custom5: z.string().optional(),
  custom6: z.string().optional(),
  custom7: z.string().optional(),
  custom8: z.string().optional(),
  custom9: z.string().optional(),
  custom10: z.string().optional()
};
