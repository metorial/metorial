import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { storeIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getStorePaymentMethods = SlateTool.create(spec, {
  name: 'Get Store Payment Methods',
  key: 'get_store_payment_methods',
  description:
    'Discover payment method IDs and enabled status for a store. Call manage_stores with action list to find a store. Requires btcpay.store.canviewstoresettings.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ storeId: storeIdSchema }))
  .output(z.object({ paymentMethods: z.array(z.record(z.string(), z.unknown())) }))
  .handleInvocation(async ctx => {
    let paymentMethods = await new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    }).getStorePaymentMethods(ctx.input.storeId);
    return {
      output: { paymentMethods },
      message: `Found **${paymentMethods.length}** payment method(s).`
    };
  })
  .build();
