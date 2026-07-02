import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organisationOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getOrganisation = SlateTool.create(spec, {
  name: 'Get Organisation',
  key: 'get_organisation',
  description: `Retrieve details about the connected Chaser organisation, including name, legal name, base currency, country, timezone, and last sync date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(organisationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getOrganisation();

    return {
      output: {
        organisationId: result.organisationId || '',
        organisationInternalId: result.id || '',
        name: result.name || '',
        legalName: result.legalName || '',
        baseCurrency: result.baseCurrency || '',
        countryCode: result.countryCode || '',
        timezone: result.timezone || '',
        lastSyncDate: result.lastSyncDate ?? null
      },
      message: `Organisation: **${result.name}** (${result.baseCurrency}, ${result.countryCode}). Last synced: ${result.lastSyncDate || 'never'}.`
    };
  })
  .build();
