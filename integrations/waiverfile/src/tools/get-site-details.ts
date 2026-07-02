import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let getSiteDetails = SlateTool.create(spec, {
  name: 'Get Site Details',
  key: 'get_site_details',
  description: `Retrieve account-level site information and configuration details for your WaiverFile account. Useful for verifying API connectivity and viewing site settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      siteDetails: z.any().describe('Complete site configuration and account details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let siteDetails = await client.getSiteDetails();

    return {
      output: { siteDetails },
      message: `Retrieved site details successfully.`
    };
  })
  .build();
