import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageContractorPayment = SlateTool.create(spec, {
  name: 'Manage Contractor Payment',
  key: 'manage_contractor_payment',
  description: `List, create, or cancel contractor payments. Create payments for individual contractors with specified wage amounts, or list/cancel existing payments.`,
  instructions: [
    'When creating a payment, provide contractorId and either hourly or fixed compensation details.',
    'start_date and end_date query params are required when listing payments.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'cancel']).describe('The action to perform'),
      companyId: z.string().describe('The UUID of the company'),
      contractorPaymentId: z
        .string()
        .optional()
        .describe('Payment UUID (required for cancel)'),
      contractorId: z.string().optional().describe('Contractor UUID (required for create)'),
      date: z.string().optional().describe('Payment date (YYYY-MM-DD) for creating a payment'),
      wage: z.number().optional().describe('Fixed wage amount'),
      hours: z.number().optional().describe('Number of hours worked (hourly contractors)'),
      bonus: z.number().optional().describe('Bonus amount'),
      reimbursement: z.number().optional().describe('Reimbursement amount'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for listing payments (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date for listing payments (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      payments: z
        .array(
          z.object({
            contractorPaymentId: z.string().describe('UUID of the payment'),
            contractorId: z.string().optional().describe('UUID of the contractor'),
            wage: z.string().optional().describe('Wage amount'),
            hours: z.string().optional().describe('Hours worked'),
            bonus: z.string().optional().describe('Bonus amount'),
            reimbursement: z.string().optional().describe('Reimbursement amount'),
            paymentDate: z.string().optional().describe('Payment date'),
            status: z.string().optional().describe('Payment status')
          })
        )
        .optional()
        .describe('List of payments (for list action)'),
      payment: z
        .object({
          contractorPaymentId: z.string().describe('UUID of the payment'),
          contractorId: z.string().optional().describe('UUID of the contractor'),
          wage: z.string().optional().describe('Wage amount'),
          bonus: z.string().optional().describe('Bonus amount'),
          reimbursement: z.string().optional().describe('Reimbursement amount'),
          paymentDate: z.string().optional().describe('Payment date')
        })
        .optional()
        .describe('Created or cancelled payment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.action) {
      case 'list': {
        let params: Record<string, any> = {};
        if (ctx.input.startDate) params.start_date = ctx.input.startDate;
        if (ctx.input.endDate) params.end_date = ctx.input.endDate;
        let result = await client.listContractorPayments(ctx.input.companyId, params);
        let payments = Array.isArray(result) ? result : result.contractor_payments || result;
        let mapped = payments.map((p: any) => ({
          contractorPaymentId: p.uuid || p.id?.toString(),
          contractorId: p.contractor_uuid || p.contractor_id?.toString(),
          wage: p.wage,
          hours: p.hours,
          bonus: p.bonus,
          reimbursement: p.reimbursement,
          paymentDate: p.date || p.payment_date,
          status: p.status
        }));
        return {
          output: { payments: mapped },
          message: `Found **${mapped.length}** contractor payment(s).`
        };
      }
      case 'create': {
        if (!ctx.input.contractorId)
          throw new Error('contractorId is required to create a payment');
        let data: Record<string, any> = {
          contractor_uuid: ctx.input.contractorId,
          date: ctx.input.date
        };
        if (ctx.input.wage !== undefined) data.wage = ctx.input.wage;
        if (ctx.input.hours !== undefined) data.hours = ctx.input.hours;
        if (ctx.input.bonus !== undefined) data.bonus = ctx.input.bonus;
        if (ctx.input.reimbursement !== undefined)
          data.reimbursement = ctx.input.reimbursement;
        let result = await client.createContractorPayment(ctx.input.companyId, data);
        return {
          output: {
            payment: {
              contractorPaymentId: result.uuid || result.id?.toString(),
              contractorId: result.contractor_uuid,
              wage: result.wage,
              bonus: result.bonus,
              reimbursement: result.reimbursement,
              paymentDate: result.date
            }
          },
          message: `Created contractor payment of $${ctx.input.wage || 0} for contractor ${ctx.input.contractorId}.`
        };
      }
      case 'cancel': {
        if (!ctx.input.contractorPaymentId)
          throw new Error('contractorPaymentId is required to cancel a payment');
        await client.cancelContractorPayment(
          ctx.input.companyId,
          ctx.input.contractorPaymentId
        );
        return {
          output: {
            payment: {
              contractorPaymentId: ctx.input.contractorPaymentId
            }
          },
          message: `Cancelled contractor payment ${ctx.input.contractorPaymentId}.`
        };
      }
    }
  })
  .build();
