import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { providerId, ReviewExpressClient } from '../lib/client';
import { spec } from '../spec';

let optInStatusSchema = z.object({
  locationId: z.string(),
  optedIn: z.boolean()
});

let parseOptIn = (value: unknown) => {
  if (value === true || value === 1 || value === 'true') return true;
  if (value === false || value === 0 || value === 'false') return false;
  throw createApiServiceError(
    'Tripadvisor returned an unrecognized opt-in status. Use list_location_mappings for the documented property mapping response.'
  );
};

export let checkReviewOptIn = SlateTool.create(spec, {
  name: 'Check Review Express Opt-In',
  key: 'check_review_optin',
  description: `Check whether one or more hotels are opted in to the Tripadvisor Review Express program using the existing email-request opt-in route. For the documented connectivity property mapping API, use list_location_mappings. Hotels must be opted in before review request emails can be sent on their behalf.`,
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
      token: ctx.auth.reviewExpressToken ?? ctx.auth.token
    });

    let result = await client.checkOptInStatus(ctx.input.locationIds);

    let statuses: Array<{ locationId: string; optedIn: boolean }> = [];
    if (Array.isArray(result)) {
      statuses = result.map((entry: any) => ({
        locationId: providerId(entry.location_id),
        optedIn: parseOptIn(entry.opted_in)
      }));
    } else if (result && typeof result === 'object') {
      for (let [locationId, status] of Object.entries(result)) {
        statuses.push({
          locationId,
          optedIn: parseOptIn(status)
        });
      }
    } else {
      throw createApiServiceError('Tripadvisor returned an unexpected opt-in response.');
    }

    let optedInCount = statuses.filter(s => s.optedIn).length;

    return {
      output: { statuses },
      message: `Checked **${statuses.length}** location(s): **${optedInCount}** opted in, **${statuses.length - optedInCount}** not opted in.`
    };
  })
  .build();
