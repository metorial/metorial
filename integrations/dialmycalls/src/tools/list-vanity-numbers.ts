import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVanityNumbers = SlateTool.create(spec, {
  name: 'List Vanity Numbers',
  key: 'list_vanity_numbers',
  description: `Retrieve dedicated vanity phone numbers associated with your account. Vanity numbers support configurable call options and can receive voicemails and incoming texts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vanityNumberId: z
        .string()
        .optional()
        .describe(
          'Fetch a specific vanity number by ID. If omitted, lists all vanity numbers.'
        ),
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      vanityNumbers: z.array(
        z.object({
          vanityNumberId: z.string().optional(),
          phone: z.string().optional(),
          status: z
            .string()
            .optional()
            .describe('Status: active, onhold, billingdecline, pendingdelete'),
          minutesUsed: z.number().optional(),
          minutesAllowed: z.number().optional(),
          voicemailsNew: z.number().optional(),
          voicemailsOld: z.number().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.vanityNumberId) {
      let vn = await client.getVanityNumber(ctx.input.vanityNumberId);
      return {
        output: {
          vanityNumbers: [
            {
              vanityNumberId: vn.id,
              phone: vn.phone,
              status: vn.status,
              minutesUsed: vn.minutes_used,
              minutesAllowed: vn.minutes_allowed,
              voicemailsNew: vn.voicemails_new,
              voicemailsOld: vn.voicemails_old,
              createdAt: vn.created_at,
              updatedAt: vn.updated_at
            }
          ]
        },
        message: `Retrieved vanity number **${vn.phone}**.`
      };
    }

    let rawNumbers = await client.listVanityNumbers(ctx.input.range);
    let vanityNumbers = rawNumbers.map(vn => ({
      vanityNumberId: vn.id,
      phone: vn.phone,
      status: vn.status,
      minutesUsed: vn.minutes_used,
      minutesAllowed: vn.minutes_allowed,
      voicemailsNew: vn.voicemails_new,
      voicemailsOld: vn.voicemails_old,
      createdAt: vn.created_at,
      updatedAt: vn.updated_at
    }));

    return {
      output: { vanityNumbers },
      message: `Retrieved **${vanityNumbers.length}** vanity number(s).`
    };
  })
  .build();
