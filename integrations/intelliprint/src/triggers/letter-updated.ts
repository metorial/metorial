import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { envelopeEnum, letterStatusEnum, postageServiceEnum } from '../lib/schemas';
import { spec } from '../spec';

export let letterUpdated = SlateTrigger.create(spec, {
  name: 'Letter Updated',
  key: 'letter_updated',
  description:
    "Triggered when a letter's status changes - specifically when a letter is printed, dispatched, delivered, or returned."
})
  .input(
    z.object({
      eventType: z.string().describe('The type of event'),
      letterId: z.string().describe('The letter ID'),
      printJobId: z.string().describe('The parent print job ID'),
      status: z.string().describe('The letter status'),
      postageService: z.string().optional().describe('The postage service'),
      envelope: z.string().optional().describe('The envelope type'),
      reference: z.string().optional().nullable().describe('Print job reference'),
      shippedDate: z.number().optional().nullable().describe('UNIX timestamp when shipped'),
      testmode: z.boolean().optional().describe('Whether this is a test mode letter'),
      returned: z
        .object({
          date: z.number().optional().describe('UNIX timestamp of return'),
          reason: z.string().optional().describe('Reason for return')
        })
        .optional()
        .nullable()
        .describe('Return information')
    })
  )
  .output(
    z.object({
      letterId: z.string().describe('The letter ID'),
      printJobId: z.string().describe('The parent print job ID'),
      status: letterStatusEnum.describe('Current letter status'),
      postageService: postageServiceEnum.optional().describe('Postage service used'),
      envelope: envelopeEnum.optional().describe('Envelope or postcard size'),
      reference: z.string().optional().nullable().describe('Print job reference'),
      shippedDate: z.number().optional().nullable().describe('UNIX timestamp when shipped'),
      testmode: z.boolean().optional().describe('Whether this is a test mode letter'),
      returnDate: z.number().optional().nullable().describe('UNIX timestamp of return'),
      returnReason: z.string().optional().nullable().describe('Reason for return')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.type ?? 'letter.updated',
            letterId: data.id,
            printJobId: data.print_id,
            status: data.status,
            postageService: data.postage_service,
            envelope: data.envelope,
            reference: data.reference ?? null,
            shippedDate: data.shipped_date ?? null,
            testmode: data.testmode,
            returned: data.returned ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `letter.${ctx.input.status}`,
        id: `${ctx.input.letterId}_${ctx.input.status}`,
        output: {
          letterId: ctx.input.letterId,
          printJobId: ctx.input.printJobId,
          status: ctx.input.status as any,
          postageService: ctx.input.postageService as any,
          envelope: ctx.input.envelope as any,
          reference: ctx.input.reference,
          shippedDate: ctx.input.shippedDate,
          testmode: ctx.input.testmode,
          returnDate: ctx.input.returned?.date ?? null,
          returnReason: ctx.input.returned?.reason ?? null
        }
      };
    }
  })
  .build();
