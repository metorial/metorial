import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cloneTemplates = SlateTool.create(spec, {
  name: 'Clone Templates',
  key: 'clone_templates',
  description:
    'Clone existing parsing templates into a target mailbox. Discover template IDs with list_templates and target mailbox IDs with list_mailboxes.'
})
  .input(
    z.object({
      templateIds: z
        .array(z.string().min(1))
        .min(1)
        .describe('Template IDs to clone; use list_templates to discover them'),
      mailboxId: z
        .string()
        .min(1)
        .describe('Target mailbox ID; use list_mailboxes to discover it')
    })
  )
  .output(
    z.object({
      mailboxId: z.string().describe('Target mailbox ID'),
      requestedTemplateIds: z
        .array(z.string())
        .describe('Source template IDs submitted for cloning'),
      result: z
        .unknown()
        .optional()
        .describe(
          'Provider response; use list_templates on the target mailbox to discover the cloned IDs'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.cloneTemplates(ctx.input.templateIds, ctx.input.mailboxId);
    return {
      output: {
        mailboxId: ctx.input.mailboxId,
        requestedTemplateIds: ctx.input.templateIds,
        result
      },
      message: `Submitted ${ctx.input.templateIds.length} template(s) for cloning into mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
