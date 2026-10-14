import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPrinters = SlateTool.create(spec, {
  name: 'Register Printers',
  key: 'create_printers',
  description:
    'Registers printers and their supported paper sizes with the connected print app so they can be used in print queues.',
  instructions: ['Provide names and paper-size properties reported by the physical printer.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      printers: z
        .array(
          z.object({
            name: z.string().trim().min(1).describe('Printer name reported by the print app.'),
            paperSizes: z
              .array(
                z.object({
                  name: z.string().min(1).describe('Paper size name, such as A4.'),
                  height: z
                    .number()
                    .positive()
                    .describe(
                      'Paper height reported by the printer driver; keep its original units.'
                    ),
                  width: z
                    .number()
                    .positive()
                    .describe(
                      'Paper width reported by the printer driver; keep its original units.'
                    ),
                  rawKind: z
                    .string()
                    .min(1)
                    .describe(
                      'Paper kind identifier reported by the printer driver, such as A4.'
                    )
                })
              )
              .min(1)
              .describe('Paper sizes supported by this printer.')
          })
        )
        .min(1)
        .describe('Printers to register for this connection.')
    })
  )
  .output(
    z.object({
      rawResponse: z.unknown().describe('Provider confirmation of printer registration.')
    })
  )
  .handleInvocation(async ctx => {
    let rawResponse = await new Client(ctx.auth.token).createPrinters(ctx.input.printers);
    return { output: { rawResponse }, message: 'Registered the printers and paper sizes.' };
  })
  .build();
