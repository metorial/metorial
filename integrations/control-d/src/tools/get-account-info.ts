import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve your Control D account information, billing history, active subscriptions, and products. Also returns your current external IP address as seen by Control D.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeBilling: z
        .boolean()
        .optional()
        .describe('Include payment history, subscriptions, and products (default: false)'),
      includeIp: z
        .boolean()
        .optional()
        .describe('Include current external IP information (default: false)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Account identifier'),
      email: z.string().describe('Account email address'),
      status: z.number().describe('Account status'),
      registrationDate: z.string().describe('Account registration date'),
      twofa: z.boolean().describe('Whether 2FA is enabled'),
      proxyAccess: z.boolean().describe('Whether proxy access is enabled'),
      currentIp: z
        .object({
          ip: z.string().describe('External IP address'),
          type: z.string().describe('IP type (v4 or v6)'),
          org: z.string().describe('ISP/Organization'),
          country: z.string().describe('Country code')
        })
        .optional(),
      payments: z
        .array(
          z.object({
            paymentId: z.string().describe('Payment ID'),
            amount: z.number().describe('Payment amount'),
            currency: z.string().describe('Currency code'),
            date: z.string().describe('Payment date'),
            description: z.string().describe('Payment description'),
            status: z.string().describe('Payment status')
          })
        )
        .optional(),
      subscriptions: z
        .array(
          z.object({
            subscriptionId: z.string().describe('Subscription ID'),
            status: z.string().describe('Subscription status'),
            plan: z.string().describe('Plan name'),
            amount: z.number().describe('Subscription amount'),
            currency: z.string().describe('Currency code'),
            nextBillingDate: z.string().describe('Next billing date')
          })
        )
        .optional(),
      products: z
        .array(
          z.object({
            productId: z.string().describe('Product ID'),
            name: z.string().describe('Product name'),
            status: z.string().describe('Product status')
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { includeBilling, includeIp } = ctx.input;

    let user = await client.getUser();

    let output: Record<string, any> = {
      userId: user.PK,
      email: user.email,
      status: user.status,
      registrationDate: user.date,
      twofa: user.twofa === 1,
      proxyAccess: user.proxy_access === 1
    };

    if (includeIp) {
      let ipInfo = await client.getCurrentIp();
      output.currentIp = {
        ip: ipInfo.ip,
        type: ipInfo.type,
        org: ipInfo.org,
        country: ipInfo.country
      };
    }

    if (includeBilling) {
      let [payments, subscriptions, products] = await Promise.all([
        client.listPayments(),
        client.listSubscriptions(),
        client.listProducts()
      ]);

      output.payments = payments.map(p => ({
        paymentId: p.PK,
        amount: p.amount,
        currency: p.currency,
        date: p.date,
        description: p.description,
        status: p.status
      }));

      output.subscriptions = subscriptions.map(s => ({
        subscriptionId: s.PK,
        status: s.status,
        plan: s.plan,
        amount: s.amount,
        currency: s.currency,
        nextBillingDate: s.next_billing_date
      }));

      output.products = products.map(p => ({
        productId: p.PK,
        name: p.name,
        status: p.status
      }));
    }

    return {
      output: output as any,
      message: `Account **${user.email}** (${user.PK})${includeIp ? `, IP: ${output.currentIp?.ip}` : ''}.`
    };
  })
  .build();
