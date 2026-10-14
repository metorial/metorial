import { SlateTool } from 'slates';
import { z } from 'zod';
import { asOptionalString, createClient, isEnabled } from '../lib/helpers';
import { spec } from '../spec';

export let listBusinesses = SlateTool.create(spec, {
  name: 'List Businesses',
  key: 'list_businesses',
  description: `List all businesses associated with the authenticated Eversign account. Returns business IDs, names, and status for selecting a business for API operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      businesses: z
        .array(
          z.object({
            businessId: z.number().describe('Business ID'),
            businessName: z.string().describe('Business display name'),
            businessIdentifier: z.string().optional().describe('Business identifier slug'),
            businessStatus: z.string().optional().describe('Business status'),
            isPrimary: z.boolean().describe('Whether this is the primary business'),
            createdAt: z.string().optional().describe('Business creation timestamp')
          })
        )
        .describe('List of businesses')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let businesses = await client.listBusinesses();

    let result = (Array.isArray(businesses) ? businesses : []).map((b: any) => ({
      businessId: b.business_id,
      businessName: b.business_name || '',
      businessIdentifier: b.business_identifier || undefined,
      businessStatus: asOptionalString(b.business_status),
      isPrimary: isEnabled(b.is_primary),
      createdAt: asOptionalString(b.creation_time_stamp)
    }));

    return {
      output: {
        businesses: result
      },
      message: `Found ${result.length} business(es).`
    };
  })
  .build();
