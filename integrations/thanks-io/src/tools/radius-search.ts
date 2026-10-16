import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let radiusSearch = SlateTool.create(spec, {
  name: 'Radius Search',
  key: 'radius_search',
  description: `Search for recipients within a geographic radius of a given address and add them to a mailing list. Supports filtering by record type (new homeowner, absentee owner, renters, businesses, etc.) and optionally appending phone/email data.
Results are added to an existing mailing list or a newly created one. Costs $0.05 per record.`,
  constraints: [
    'Each record costs $0.05.',
    'Maximum of 2,500 records per purchase; API Test Mode allows at most 5.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      address: z.string().describe('Center address for the radius search'),
      postalCode: z.string().describe('ZIP/postal code of the center address'),
      recordCount: z
        .number()
        .min(1)
        .max(10000)
        .describe('Number of records to purchase (1-2500; at most 5 in API Test Mode)'),
      mailingListId: z
        .number()
        .optional()
        .describe('Existing mailing list ID to add results to (creates new list if omitted)'),
      recordTypes: z
        .enum([
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
        ])
        .optional()
        .default('all')
        .describe('Type of records to search for'),
      includeCondos: z.boolean().optional().describe('Include condos in results'),
      appendData: z.boolean().optional().describe('Append phone and email data to records'),
      usePropertyOwner: z
        .boolean()
        .optional()
        .describe('Use property owner name instead of resident'),
      includeSearchAddress: z
        .boolean()
        .optional()
        .describe('Include the center address in results')
    })
  )
  .output(
    z.object({
      mailingListId: z
        .number()
        .optional()
        .describe('Mailing list ID where results were added'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response'),
      success: z.boolean().describe('Whether the search was successful'),
      statusMessage: z.string().optional().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });

    let result = await client.buyRadiusSearch({
      address: ctx.input.address,
      postalCode: ctx.input.postalCode,
      recordCount: ctx.input.recordCount,
      mailingListId: ctx.input.mailingListId,
      recordTypes: ctx.input.recordTypes,
      includeCondos: ctx.input.includeCondos,
      appendData: ctx.input.appendData,
      usePropertyOwner: ctx.input.usePropertyOwner,
      includeSearchAddress: ctx.input.includeSearchAddress
    });

    let failed = result.failure as boolean | undefined;
    return {
      output: {
        mailingListId: result.mailing_list_id as number | undefined,
        success: !failed,
        raw: result,
        statusMessage: result.message as string | undefined
      },
      message: failed
        ? `Radius search failed: ${result.message}`
        : `Radius search completed. **${ctx.input.recordCount}** records requested near "${ctx.input.address}". Added to mailing list **#${result.mailing_list_id}**.`
    };
  })
  .build();
