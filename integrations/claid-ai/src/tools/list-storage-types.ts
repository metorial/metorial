import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStorageTypes = SlateTool.create(spec, {
  name: 'List Storage Types',
  key: 'list_storage_types',
  description:
    'Discover the cloud storage connector types supported by Claid.ai before creating a storage connection.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ storageTypes: z.array(z.string()).describe('Supported connector types') })
  )
  .handleInvocation(async ctx => {
    let { data } = await new Client({ token: ctx.auth.token }).listStorageTypes();
    return {
      output: { storageTypes: data },
      message: `Found **${data.length}** supported storage type(s).`
    };
  })
  .build();
