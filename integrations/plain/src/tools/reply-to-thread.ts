import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let replyToThread = SlateTool.create(spec, {
  name: 'Reply to Thread',
  key: 'reply_to_thread',
  description: `Send a reply to an existing thread. The reply is composed of UI components (text, spacers, link buttons). Optionally impersonate a customer when replying.`,
  instructions: [
    'At minimum, include at least one componentText in the components array.',
    'Use impersonation to reply as a customer (e.g., when building a support portal).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('Plain thread ID to reply to'),
      components: z
        .array(
          z.object({
            componentText: z
              .object({
                text: z.string().describe('Text content')
              })
              .optional(),
            componentSpacer: z
              .object({
                spacerSize: z.enum(['XS', 'S', 'M', 'L', 'XL']).describe('Spacer size')
              })
              .optional(),
            componentLinkButton: z
              .object({
                linkButtonLabel: z.string().describe('Button label'),
                linkButtonUrl: z.string().describe('Button URL')
              })
              .optional()
          })
        )
        .describe('UI components for the reply message'),
      impersonation: z
        .object({
          asCustomer: z.object({
            customerIdentifier: z.object({
              emailAddress: z.string().optional().describe('Customer email'),
              customerId: z.string().optional().describe('Customer ID'),
              externalId: z.string().optional().describe('Customer external ID')
            })
          })
        })
        .optional()
        .describe('Send the reply as a customer (impersonation)'),
      channelSpecificOptions: z
        .object({
          email: z
            .object({
              additionalRecipients: z
                .array(
                  z.object({
                    email: z.string().describe('Recipient email'),
                    name: z.string().optional().describe('Recipient name')
                  })
                )
                .optional()
                .describe('Cc recipients'),
              hiddenRecipients: z
                .array(
                  z.object({
                    email: z.string().describe('Recipient email'),
                    name: z.string().optional().describe('Recipient name')
                  })
                )
                .optional()
                .describe('Bcc recipients')
            })
            .optional()
        })
        .optional()
        .describe('Channel-specific options like email Cc/Bcc')
    })
  )
  .output(
    z.object({
      replied: z.boolean().describe('Whether the reply was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: any = {
      threadId: ctx.input.threadId,
      components: ctx.input.components
    };

    if (ctx.input.impersonation) {
      input.impersonation = ctx.input.impersonation;
    }
    if (ctx.input.channelSpecificOptions) {
      input.channelSpecificOptions = ctx.input.channelSpecificOptions;
    }

    await client.replyToThread(input);

    return {
      output: { replied: true },
      message: `Reply sent to thread **${ctx.input.threadId}**`
    };
  })
  .build();
