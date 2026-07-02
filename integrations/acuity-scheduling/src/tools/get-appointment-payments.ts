import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAppointmentPayments = SlateTool.create(spec, {
  name: 'Get Appointment Payments',
  key: 'get_appointment_payments',
  description: `Retrieve payment information for a specific appointment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('The ID of the appointment')
    })
  )
  .output(
    z.object({
      payments: z
        .array(
          z.object({
            paymentId: z.number().optional().describe('Payment ID'),
            amount: z.string().optional().describe('Payment amount'),
            processor: z.string().optional().describe('Payment processor'),
            transactionId: z.string().optional().describe('Transaction ID'),
            created: z.string().optional().describe('Payment creation date')
          })
        )
        .describe('List of payments for the appointment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let results = await client.getAppointmentPayments(ctx.input.appointmentId);

    let payments = (Array.isArray(results) ? results : [results])
      .filter(Boolean)
      .map((p: any) => ({
        paymentId: p.id || undefined,
        amount: p.amount || undefined,
        processor: p.processor || undefined,
        transactionId: p.transactionID || undefined,
        created: p.created || undefined
      }));

    return {
      output: { payments },
      message: `Found **${payments.length}** payment(s) for appointment **#${ctx.input.appointmentId}**.`
    };
  })
  .build();
