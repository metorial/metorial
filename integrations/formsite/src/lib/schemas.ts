import { z } from 'zod';

export let formDirSchema = z
  .string()
  .describe('Form directory identifier. Call list_forms to discover available forms.');

export let resultSchema = z.object({
  resultId: z.string().describe('Unique result/submission identifier'),
  dateStart: z.string().describe('When the user started filling out the form, if recorded'),
  dateFinish: z.string().describe('When the user submitted the form, if completed'),
  dateUpdate: z.string().describe('When the result was last updated'),
  userIp: z.string().describe('IP address of the submitter'),
  userBrowser: z.string().describe('Browser used by the submitter'),
  userDevice: z.string().describe('Device type used by the submitter'),
  userReferrer: z.string().describe('Referrer URL'),
  resultStatus: z.string().describe('Result status'),
  loginUsername: z.string().optional().describe('Save & Return username if applicable'),
  loginEmail: z.string().optional().describe('Save & Return email if applicable'),
  paymentStatus: z.string().optional().describe('Payment status if applicable'),
  paymentAmount: z.string().optional().describe('Payment amount if applicable'),
  items: z
    .array(
      z.object({
        itemId: z.string().describe('Item/field ID matching the form item definitions'),
        value: z.string().describe('Text answer or comma-separated selected choice labels'),
        position: z.number().optional().describe('Position of the item on the form'),
        values: z
          .array(
            z.object({
              value: z.string().describe('Selected choice label'),
              position: z.number().optional().describe('Position of the selected choice'),
              other: z.string().optional().describe('Other answer text, when supplied')
            })
          )
          .optional()
          .describe('Selected choices for multiple-choice items')
      })
    )
    .describe('Submitted field values')
});
