import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLicenses = SlateTool.create(spec, {
  name: 'List Licenses',
  key: 'list_licenses',
  description:
    'Identify the HelpDesk account accessible to this connection, including its license ID, company name, and default team. Normally one license is returned.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      licenses: z.array(
        z.object({
          id: z.number().describe('HelpDesk license ID'),
          companyName: z.string().optional(),
          defaultTeamID: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let licenses = (await client.listLicenses()).map(license => ({
      id: license.ID,
      companyName: license.settings?.companyName,
      defaultTeamID: license.defaultTeamID,
      createdAt: license.createdAt,
      updatedAt: license.updatedAt
    }));
    return {
      output: { licenses },
      message: `Found **${licenses.length}** HelpDesk license(s).`
    };
  })
  .build();
