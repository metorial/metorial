import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  success: z
    .boolean()
    .describe('True only for the native success status; pending is not delivery.'),
  accepted: z.boolean(),
  messageId: z.string(),
  status: z.enum(['pending', 'failed', 'success']),
  deliveryResult: z.string().optional()
});

export let sendSmsTool = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to one or more phone numbers through Dialpad. Optionally specify a sender user or group.`,
  constraints: [
    'Sending SMS can incur charges and retains message history. Explicitly verify the destination before sending.'
  ]
})
  .input(
    z.object({
      toNumbers: z
        .array(z.string())
        .describe('Phone numbers to send the SMS to (E.164 format recommended)'),
      text: z.string().describe('Message text to send'),
      senderId: z.number().optional().describe('User ID to send the SMS from'),
      senderGroupType: z
        .string()
        .optional()
        .describe('Sender group type (e.g., "department", "callcenter")'),
      senderGroupId: z.number().optional().describe('Sender group ID'),
      inferCountryCode: z
        .boolean()
        .optional()
        .describe('Whether to infer country code from phone numbers')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'send_sms');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
