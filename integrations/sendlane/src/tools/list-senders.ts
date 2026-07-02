import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listSenders = SlateTool.create(spec, {
  name: 'List Sender Profiles',
  key: 'list_senders',
  description: `Retrieve all sender profiles in your Sendlane account. Sender profiles define the "from" identity used when sending emails.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination'),
      perPage: z.number().optional().default(25).describe('Number of results per page')
    })
  )
  .output(
    z.object({
      senders: z.array(
        z.object({
          senderId: z.number().describe('Sendlane sender profile ID'),
          name: z.string().describe('Sender name'),
          email: z.string().describe('Sender email address'),
          createdAt: z.string().describe('When the sender profile was created'),
          updatedAt: z.string().describe('When the sender profile was last updated')
        })
      ),
      currentPage: z.number(),
      lastPage: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);
    let result = await client.listSenders(ctx.input.page, ctx.input.perPage);

    let senders = result.data.map(s => ({
      senderId: s.id,
      name: s.name ?? '',
      email: s.email ?? '',
      createdAt: s.created_at ?? '',
      updatedAt: s.updated_at ?? ''
    }));

    return {
      output: {
        senders,
        currentPage: result.pagination.currentPage,
        lastPage: result.pagination.lastPage,
        total: result.pagination.total
      },
      message: `Found **${senders.length}** sender profiles.`
    };
  })
  .build();
