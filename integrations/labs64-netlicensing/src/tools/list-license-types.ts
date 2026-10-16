import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLicenseTypes = SlateTool.create(spec, {
  name: 'List License Types',
  key: 'list_license_types',
  description:
    'Discover license types supported by NetLicensing before configuring a product module or license template.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ licenseTypes: z.array(z.object({ name: z.string() })) }))
  .handleInvocation(async ctx => {
    let items = await new Client(ctx.auth.token).listLicenseTypes();
    return {
      message: 'Supported license types retrieved.',
      output: { licenseTypes: items.map(item => ({ name: item.name })) }
    };
  })
  .build();
