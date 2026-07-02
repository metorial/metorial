import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCardLinksTool = SlateTool.create(spec, {
  name: 'Manage Card Links',
  key: 'manage_card_links',
  description: `Create or remove relationships between cards. Supports parent-child relationships and linked card connections for tracking cross-team dependencies.`
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the primary card'),
      action: z
        .enum(['add_parent', 'remove_parent', 'link', 'unlink', 'list'])
        .describe(
          'Action to perform: "add_parent" or "remove_parent" for parent-child relationships, "link" or "unlink" for linked cards, "list" to view all linked cards.'
        ),
      targetCardId: z
        .number()
        .optional()
        .describe('ID of the target card (required for all actions except list)'),
      linkType: z
        .number()
        .optional()
        .describe('Link type for "link" action (e.g. 0=related, 1=predecessor, 2=successor)')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('Primary card ID'),
      linkedCards: z
        .array(
          z.object({
            linkedCardId: z.number().describe('Linked card ID'),
            linkType: z.number().optional().describe('Link type')
          })
        )
        .optional()
        .describe('List of linked cards (for list action)'),
      parentCards: z
        .array(
          z.object({
            parentCardId: z.number().describe('Parent card ID')
          })
        )
        .optional()
        .describe('List of parent cards'),
      childCards: z
        .array(
          z.object({
            childCardId: z.number().describe('Child card ID')
          })
        )
        .optional()
        .describe('List of child cards'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    if (ctx.input.action === 'list') {
      let [linked, parents, children] = await Promise.all([
        client.listLinkedCards(ctx.input.cardId),
        client.listParentCards(ctx.input.cardId),
        client.listChildCards(ctx.input.cardId)
      ]);

      return {
        output: {
          cardId: ctx.input.cardId,
          linkedCards: (linked ?? []).map((l: any) => ({
            linkedCardId: l.linked_card_id ?? l.card_id,
            linkType: l.link_type
          })),
          parentCards: (parents ?? []).map((p: any) => ({
            parentCardId: p.parent_card_id ?? p.card_id
          })),
          childCards: (children ?? []).map((c: any) => ({
            childCardId: c.child_card_id ?? c.card_id
          })),
          success: true
        },
        message: `Card **${ctx.input.cardId}** has ${(linked ?? []).length} linked card(s), ${(parents ?? []).length} parent(s), and ${(children ?? []).length} child(ren).`
      };
    }

    if (!ctx.input.targetCardId) throw new Error('targetCardId is required for this action.');

    if (ctx.input.action === 'add_parent') {
      await client.addParentCard(ctx.input.cardId, ctx.input.targetCardId);
      return {
        output: { cardId: ctx.input.cardId, success: true },
        message: `Added card **${ctx.input.targetCardId}** as parent of card **${ctx.input.cardId}**.`
      };
    }

    if (ctx.input.action === 'remove_parent') {
      await client.removeParentCard(ctx.input.cardId, ctx.input.targetCardId);
      return {
        output: { cardId: ctx.input.cardId, success: true },
        message: `Removed parent card **${ctx.input.targetCardId}** from card **${ctx.input.cardId}**.`
      };
    }

    if (ctx.input.action === 'link') {
      await client.linkCard(ctx.input.cardId, ctx.input.targetCardId, ctx.input.linkType ?? 0);
      return {
        output: { cardId: ctx.input.cardId, success: true },
        message: `Linked card **${ctx.input.targetCardId}** to card **${ctx.input.cardId}**.`
      };
    }

    // unlink
    await client.unlinkCard(ctx.input.cardId, ctx.input.targetCardId);
    return {
      output: { cardId: ctx.input.cardId, success: true },
      message: `Unlinked card **${ctx.input.targetCardId}** from card **${ctx.input.cardId}**.`
    };
  })
  .build();
