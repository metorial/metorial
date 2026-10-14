import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPaymentProfiles = SlateTool.create(spec, {
  name: 'List Payment Profiles',
  key: 'list_payment_profiles',
  description:
    'List stored payment profiles for a client. Use their IDs with create_payment or recurring schedules that automatically bill the client.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      clientId: z.number().describe('Client ID. Use get_client to find clients.')
    })
  )
  .output(
    z.object({
      paymentProfiles: z.array(
        z.object({
          paymentProfileId: z.number().describe('ID of the stored payment profile'),
          clientId: z.number().optional().describe('Associated client ID'),
          name: z.string().describe('Cardholder name'),
          gateway: z.string().optional().describe('Payment gateway'),
          expirationDate: z.string().optional().describe('Expiration date'),
          address: z.string().optional().describe('Billing street address'),
          city: z.string().optional().describe('Billing city'),
          state: z.string().optional().describe('Billing state or province'),
          zip: z.string().optional().describe('Billing postal code'),
          country: z.string().optional().describe('Billing country'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      totalCount: z.number().optional().describe('Total number of payment profiles'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listPaymentProfiles(ctx.input.clientId);
    let paymentProfiles = (result.payment_profiles || []).map((profile: any) => ({
      paymentProfileId: profile.id,
      clientId: profile.client_id ?? undefined,
      name: profile.name,
      gateway: profile.gateway ?? undefined,
      expirationDate: profile.expiration_date ?? undefined,
      address: profile.address ?? undefined,
      city: profile.city ?? undefined,
      state: profile.state ?? undefined,
      zip: profile.zip ?? undefined,
      country: profile.country ?? undefined,
      createdAt: profile.created_at ?? undefined,
      updatedAt: profile.updated_at ?? undefined
    }));

    return {
      output: {
        paymentProfiles,
        totalCount: result.total_count ?? undefined,
        pageCount: result.page_count ?? undefined
      },
      message: `Retrieved ${paymentProfiles.length} payment profile(s) for client ID ${ctx.input.clientId}.`
    };
  })
  .build();
