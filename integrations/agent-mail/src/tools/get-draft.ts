import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDraft = SlateTool.create(spec, {
  name: 'Get Draft',
  key: 'get_draft',
  description:
    'Read an email draft, including its complete body, recipients, labels, attachments, and scheduled send state before editing or sending it.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      inboxId: z
        .string()
        .describe('Inbox containing the draft. Call list_inboxes to discover inbox IDs.'),
      draftId: z.string().describe('Draft ID. Call list_drafts to discover draft IDs.')
    })
  )
  .output(
    z.object({
      draftId: z.string(),
      inboxId: z.string(),
      draft: z
        .record(z.string(), z.unknown())
        .describe(
          'Complete draft returned by AgentMail, including optional recipient and scheduling fields.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let draft = await new Client({ token: ctx.auth.token, podId: ctx.config.podId }).getDraft(
      ctx.input.inboxId,
      ctx.input.draftId
    );
    return {
      output: { draftId: draft.draft_id, inboxId: draft.inbox_id, draft: { ...draft } },
      message: `Retrieved draft ${draft.draft_id}.`
    };
  })
  .build();
