import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { spec } from '../spec';

export let listOrderBatchRecipients = SlateTool.create(spec, {
  name: 'List Order Batch Recipients',
  key: 'list_order_batch_recipients',
  description:
    'Read all original recipients in an order batch, including scheduled batches before orders exist. Paginate beyond the first ten recipients shown in batch previews.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orderBatchId: z.string().describe('Order batch ID from send_gift or list_order_batches'),
      page: z.number().optional().describe('Page number starting at 1'),
      perPage: z.number().optional().describe('Items per page from 1 to 100; defaults to 20')
    })
  )
  .output(
    z.object({
      recipients: z.array(
        z.object({
          firstName: z.string().describe('Original recipient first name'),
          lastName: z.string().nullable().describe('Original recipient last name'),
          email: z.string().nullable().describe('Original recipient email')
        })
      ),
      totalCount: z.number().describe('Total recipients in the batch')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createGoodyClient(ctx).getOrderBatchRecipients(
      ctx.input.orderBatchId,
      ctx.input
    );
    let recipients = (result.data ?? []).map(
      (recipient: {
        first_name: string;
        last_name?: string | null;
        email?: string | null;
      }) => ({
        firstName: recipient.first_name,
        lastName: recipient.last_name ?? null,
        email: recipient.email ?? null
      })
    );
    return {
      output: { recipients, totalCount: result.list_meta?.total_count ?? recipients.length },
      message: `Returned **${recipients.length}** recipient(s) on this page.`
    };
  })
  .build();
