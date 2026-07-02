import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let programSchema = z.object({
  programId: z.string().describe('Unique program ID'),
  isActive: z.boolean().optional().describe('Whether the program is active'),
  name: z.string().optional().describe('Program name'),
  type: z.string().optional().describe('Program type (Web or Form)'),
  title: z.string().optional().describe('Program title'),
  memberOffer: z.string().optional().describe('Offer for members'),
  referralOffer: z.string().optional().describe('Offer for referrals'),
  directUrl: z.string().optional().describe('Direct program URL'),
  widgetUrl: z.string().optional().describe('Widget embed URL')
});

export let listPrograms = SlateTool.create(spec, {
  name: 'List Programs',
  key: 'list_programs',
  description: `Retrieve referral programs configured in your account. Programs contain settings like member and referral offers, URLs, and aggregate statistics. Can retrieve all programs or a specific one by ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().optional().describe('Specific program ID to retrieve'),
      offset: z.number().optional().describe('Starting index for pagination (0-based)'),
      count: z.number().optional().describe('Maximum number of programs to return')
    })
  )
  .output(
    z.object({
      programs: z.array(programSchema).describe('List of referral programs'),
      total: z.number().optional().describe('Total number of programs available'),
      offset: z.number().optional().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.listPrograms({
      programId: ctx.input.programId,
      offset: ctx.input.offset,
      count: ctx.input.count
    });

    let programs = ((result.programs as Record<string, unknown>[]) || []).map(p => ({
      programId: p.id as string,
      isActive: p.isActive as boolean | undefined,
      name: p.name as string | undefined,
      type: p.type as string | undefined,
      title: p.title as string | undefined,
      memberOffer: p.memberOffer as string | undefined,
      referralOffer: p.referralOffer as string | undefined,
      directUrl: p.directUrl as string | undefined,
      widgetUrl: p.widgetUrl as string | undefined
    }));

    return {
      output: {
        programs,
        total: result.total as number | undefined,
        offset: result.offset as number | undefined
      },
      message: `Retrieved **${programs.length}** program(s)${result.total ? ` out of ${result.total} total` : ''}.`
    };
  })
  .build();
