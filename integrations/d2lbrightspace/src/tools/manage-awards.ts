import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listAwards = SlateTool.create(spec, {
  name: 'List Awards',
  key: 'list_awards',
  description: `List awards (badges and certificates) available in the organization, or list awards issued to a specific user.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          'If provided, lists awards issued to this user instead of organization awards'
        )
    })
  )
  .output(
    z.object({
      awards: z
        .array(
          z.object({
            awardId: z.string().describe('Award ID'),
            title: z.string().optional().describe('Award title'),
            description: z.string().optional().describe('Award description'),
            awardType: z.number().optional().describe('Award type (1=Badge, 2=Certificate)'),
            issuedDate: z.string().optional().describe('Date issued (for user awards)'),
            issuedId: z.string().optional().describe('Issued award ID (for user awards)')
          })
        )
        .describe('List of awards')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.userId) {
      let result = await client.getUserAwards(ctx.input.userId);
      let items = Array.isArray(result) ? result : result?.Objects || [];
      let awards = items.map((a: any) => ({
        awardId: String(a.Award?.AwardId || a.AwardId),
        title: a.Award?.Title || a.Title,
        description: a.Award?.Description || a.Description,
        awardType: a.Award?.AwardType,
        issuedDate: a.IssuedDate,
        issuedId: a.IssuedId ? String(a.IssuedId) : undefined
      }));

      return {
        output: { awards },
        message: `Found **${awards.length}** award(s) for user ${ctx.input.userId}.`
      };
    }

    let result = await client.listAwards();
    let items = Array.isArray(result) ? result : result?.Objects || [];
    let awards = items.map((a: any) => ({
      awardId: String(a.AwardId),
      title: a.Title,
      description: a.Description,
      awardType: a.AwardType
    }));

    return {
      output: { awards },
      message: `Found **${awards.length}** organization award(s).`
    };
  })
  .build();

export let issueAward = SlateTool.create(spec, {
  name: 'Issue Award',
  key: 'issue_award',
  description: `Issue a badge or certificate to a user within an org unit. Requires an award association with the org unit.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Org unit ID where the award is associated'),
      awardId: z.number().describe('Award ID to issue'),
      userId: z.number().describe('User ID to receive the award'),
      criteria: z.string().optional().describe('Criteria for issuing the award'),
      evidence: z.string().optional().describe('Evidence supporting the award')
    })
  )
  .output(
    z.object({
      issuedId: z.string().describe('Issued award ID'),
      awardId: z.string().describe('Award ID'),
      userId: z.string().describe('Recipient user ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let issueData: any = {
      AwardId: ctx.input.awardId,
      UserId: ctx.input.userId
    };
    if (ctx.input.criteria) issueData.Criteria = ctx.input.criteria;
    if (ctx.input.evidence) issueData.Evidence = ctx.input.evidence;

    let result = await client.issueAward(ctx.input.orgUnitId, issueData);

    return {
      output: {
        issuedId: String(result.IssuedId),
        awardId: String(result.AwardId || ctx.input.awardId),
        userId: String(result.UserId || ctx.input.userId)
      },
      message: `Issued award **${ctx.input.awardId}** to user **${ctx.input.userId}** (Issued ID: ${result.IssuedId}).`
    };
  })
  .build();

export let revokeAward = SlateTool.create(spec, {
  name: 'Revoke Award',
  key: 'revoke_award',
  description: `Revoke a previously issued award (badge or certificate) by its issued award ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      issuedId: z.string().describe('Issued award ID to revoke')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the revocation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.revokeAward(ctx.input.issuedId);

    return {
      output: { success: true },
      message: `Revoked award (Issued ID: ${ctx.input.issuedId}).`
    };
  })
  .build();
