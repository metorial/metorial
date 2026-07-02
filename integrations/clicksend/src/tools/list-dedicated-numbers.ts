import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

export let listDedicatedNumbersTool = SlateTool.create(spec, {
  name: 'List Dedicated Numbers',
  key: 'list_dedicated_numbers',
  description: `Retrieve all dedicated phone numbers purchased in your ClickSend account. Dedicated numbers are used for sending and receiving SMS, MMS, and voice messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of dedicated numbers'),
      numbers: z
        .array(
          z.object({
            dedicatedNumber: z.string().describe('The dedicated phone number'),
            purpose: z.string().optional().describe('Purpose (e.g., receive, send, both)'),
            country: z.string().optional().describe('Country of the number')
          })
        )
        .describe('List of dedicated numbers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.getDedicatedNumbers({
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let numbers = (result.data?.data || []).map((n: any) => ({
      dedicatedNumber: n.dedicated_number || '',
      purpose: n.purpose || undefined,
      country: n.country || undefined
    }));

    return {
      output: {
        currentPage: result.data?.current_page || 1,
        totalPages: result.data?.last_page || 1,
        totalCount: result.data?.total || 0,
        numbers
      },
      message: `Found **${numbers.length}** dedicated number(s).`
    };
  })
  .build();
