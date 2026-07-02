import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePostmortem = SlateTool.create(spec, {
  name: 'Manage Postmortem',
  key: 'manage_postmortem',
  description: `Create, update, publish, or revert a postmortem for a resolved incident. Postmortems support a draft workflow:
- **Get**: Retrieve the current postmortem for an incident.
- **Save draft**: Provide \`body\` to create or update the postmortem draft.
- **Publish**: Set \`publish\` to true with optional subscriber/Twitter notifications.
- **Revert**: Set \`revert\` to true to revert a published postmortem back to draft.`
})
  .input(
    z.object({
      incidentId: z.string().describe('ID of the resolved incident'),
      body: z.string().optional().describe('Postmortem body content (markdown supported)'),
      publish: z.boolean().optional().describe('Set to true to publish the postmortem'),
      revert: z
        .boolean()
        .optional()
        .describe('Set to true to revert a published postmortem to draft'),
      notifySubscribers: z.boolean().optional().describe('Notify subscribers when publishing'),
      notifyTwitter: z.boolean().optional().describe('Post to Twitter when publishing')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('ID of the incident'),
      postmortemBody: z.string().optional().nullable().describe('Postmortem body content'),
      published: z.boolean().optional().describe('Whether the postmortem is published'),
      reverted: z.boolean().optional().describe('Whether the postmortem was reverted to draft')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });

    if (ctx.input.revert) {
      await client.revertPostmortem(ctx.input.incidentId);
      return {
        output: { incidentId: ctx.input.incidentId, reverted: true },
        message: `Reverted postmortem for incident \`${ctx.input.incidentId}\` to draft.`
      };
    }

    if (ctx.input.publish) {
      let result = await client.publishPostmortem(
        ctx.input.incidentId,
        ctx.input.notifySubscribers ?? false,
        ctx.input.notifyTwitter ?? false
      );
      return {
        output: {
          incidentId: ctx.input.incidentId,
          postmortemBody: result?.body,
          published: true
        },
        message: `Published postmortem for incident \`${ctx.input.incidentId}\`.`
      };
    }

    if (ctx.input.body !== undefined) {
      let result = await client.createOrUpdatePostmortem(ctx.input.incidentId, {
        body: ctx.input.body
      });
      return {
        output: {
          incidentId: ctx.input.incidentId,
          postmortemBody: result?.body
        },
        message: `Saved postmortem draft for incident \`${ctx.input.incidentId}\`.`
      };
    }

    let result = await client.getPostmortem(ctx.input.incidentId);
    return {
      output: {
        incidentId: ctx.input.incidentId,
        postmortemBody: result?.body
      },
      message: `Retrieved postmortem for incident \`${ctx.input.incidentId}\`.`
    };
  })
  .build();
