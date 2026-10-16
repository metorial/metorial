import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let conversionUserSchema = z.object({
  externalId: z.string().optional().describe('External user ID for conversion matching'),
  city: z.string().optional().describe('User city'),
  state: z.string().optional().describe('User state'),
  country: z.string().optional().describe('Two-letter user country code'),
  zip: z.string().optional().describe('User postal code'),
  gender: z.enum(['m', 'f']).optional().describe('User gender for conversion matching'),
  email: z.string().optional().describe('User email'),
  phone: z.string().optional().describe('User phone number'),
  firstName: z.string().optional().describe('User first name'),
  lastName: z.string().optional().describe('User last name')
});

let conversionEventSchema = z.object({
  user: conversionUserSchema.describe('User who performed the conversion'),
  event: z
    .enum([
      'ViewContent',
      'Search',
      'AddToCart',
      'AddToWishlist',
      'InitiateCheckout',
      'AddPaymentInfo',
      'Purchase',
      'Lead'
    ])
    .describe('Conversion event type'),
  timestamp: z.number().describe('When the conversion occurred (UNIX timestamp)'),
  value: z.number().optional().describe('Monetary value of the conversion')
});

export let uploadOfflineConversions = SlateTool.create(spec, {
  name: 'Upload Offline Conversions',
  key: 'upload_offline_conversions',
  description: `Upload offline conversion events to track actions that happen outside of digital platforms. This data is used to optimize ad campaign performance by feeding conversion data back to ad platforms.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      conversions: z
        .array(conversionEventSchema)
        .min(1)
        .describe('List of offline conversion events to upload')
    })
  )
  .output(
    z.object({
      uploaded: z.boolean().describe('Whether the conversions were uploaded successfully'),
      count: z.number().describe('Number of conversions uploaded'),
      raw: z.any().optional().describe('Original provider acknowledgement, when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });

    let mappedConversions = ctx.input.conversions.map(c => ({
      user: {
        id: c.user.externalId,
        city: c.user.city,
        state: c.user.state,
        country: c.user.country,
        zip: c.user.zip,
        gender: c.user.gender,
        email: c.user.email,
        phone: c.user.phone,
        first_name: c.user.firstName,
        last_name: c.user.lastName
      },
      event: c.event,
      timestamp: c.timestamp,
      value: c.value
    }));

    let acknowledgement = await client.uploadOfflineConversions('me', mappedConversions);

    return {
      output: {
        uploaded: true,
        count: ctx.input.conversions.length,
        raw: acknowledgement
      },
      message: `Uploaded **${ctx.input.conversions.length}** offline conversion(s).`
    };
  })
  .build();
