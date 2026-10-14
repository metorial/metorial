import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

export let getFinderResult = SlateTool.create(spec, {
  name: 'Get Finder Result',
  key: 'get_finder_result',
  description:
    'Retrieve the result of an instant email finder request that continued in the background after timing out. Use the queueId returned by find_email.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({ queueId: z.string().min(1).describe('Queue ID returned by find_email.') }))
  .output(
    z.object({
      queueId: z.string().describe('Queue ID queried.'),
      status: z.string().optional().describe('API response status.'),
      emails: z.array(
        z.object({
          emailAddress: z.string().describe('Discovered email address.'),
          role: z.string().optional().describe('Whether the address is role based.'),
          business: z.string().optional().describe('Whether the address is a business email.')
        })
      ),
      result: z
        .record(z.string(), z.unknown())
        .describe(
          'Discovery result including name, domain, confidence score, company, and discovery timestamp.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearoutClient({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let response = await client.findEmailQueueStatus(ctx.input.queueId);
    let result = isApiErrorRecord(response.data) ? response.data : response;
    let emails = Array.isArray(result.emails)
      ? result.emails.filter(isApiErrorRecord).map(email => ({
          emailAddress: String(email.email_address ?? ''),
          role: typeof email.role === 'string' ? email.role : undefined,
          business: typeof email.business === 'string' ? email.business : undefined
        }))
      : [];
    return {
      output: {
        queueId: ctx.input.queueId,
        status: response.status as string | undefined,
        emails,
        result
      },
      message: `Retrieved finder result for queue **${ctx.input.queueId}** with **${emails.length}** email address(es).`
    };
  })
  .build();
