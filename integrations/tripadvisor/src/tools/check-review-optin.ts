import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReviewExpressClient } from '../lib/client';
import { spec } from '../spec';

let optInStatusSchema = z.object({
  locationId: z.string(),
  optedIn: z.boolean()
});

export let checkReviewOptIn = SlateTool.create(spec, {
  name: 'Check Review Express Opt-In',
  key: 'check_review_optin',
  description: `Check whether one or more hotels are opted in to the Tripadvisor Review Express program. Hotels must be opted in before review request emails can be sent on their behalf. Supports bulk checking of multiple location IDs at once.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locationIds: z.array(z.string()).describe('List of Tripadvisor location IDs to check')
    })
  )
  .output(
    z.object({
      statuses: z.array(optInStatusSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReviewExpressClient({
      token: ctx.auth.token
    });

    let result = await client.checkOptInStatus(ctx.input.locationIds);

    let statuses: Array<{ locationId: string; optedIn: boolean }> = [];
    if (Array.isArray(result)) {
      statuses = result.map((entry: any) => ({
        locationId: String(entry.location_id),
        optedIn: Boolean(entry.opted_in)
      }));
    } else if (result && typeof result === 'object') {
      for (let [locationId, status] of Object.entries(result)) {
        statuses.push({
          locationId,
          optedIn: Boolean(status)
        });
      }
    }

    let optedInCount = statuses.filter(s => s.optedIn).length;

    return {
      output: { statuses },
      message: `Checked **${statuses.length}** location(s): **${optedInCount}** opted in, **${statuses.length - optedInCount}** not opted in.`
    };
  })
  .build();
