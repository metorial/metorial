import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';

export let getBilling = SlateTool.create(spec, {
  name: 'Get Billing',
  key: 'get_billing',
  description: `Retrieve the current billing summary for your bunny.net account. Includes current balance, monthly charges, and usage details across all services.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z
      .object({
        balance: z.number().optional().describe('Current account balance'),
        thisMonthCharges: z.number().optional().describe('Charges for the current month'),
        billingRecords: z
          .array(
            z
              .object({
                amount: z.number().optional().describe('Charge amount'),
                timestamp: z.string().optional().describe('Billing record timestamp'),
                type: z.number().optional().describe('Billing record type'),
                invoiceAvailable: z
                  .boolean()
                  .optional()
                  .describe('Whether an invoice is available')
              })
              .passthrough()
          )
          .optional()
          .describe('Recent billing records'),
        monthlyChargesStorage: z.number().optional().describe('Monthly storage charges'),
        monthlyChargesEUTraffic: z.number().optional().describe('Monthly EU traffic charges'),
        monthlyChargesUSTraffic: z.number().optional().describe('Monthly US traffic charges'),
        monthlyChargesASIATraffic: z
          .number()
          .optional()
          .describe('Monthly Asia traffic charges'),
        monthlyChargesSATraffic: z
          .number()
          .optional()
          .describe('Monthly South America traffic charges')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new CoreClient({ token: ctx.auth.token });
    let billing = await client.getBillingSummary();

    return {
      output: billing,
      message: `Billing summary: Balance **$${billing.Balance?.toFixed(2) || '0.00'}**, this month charges **$${billing.ThisMonthCharges?.toFixed(2) || '0.00'}**.`
    };
  })
  .build();
