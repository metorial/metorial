import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDataStoreFields = SlateTool.create(spec, {
  name: 'Get Data Store Fields',
  key: 'get_data_store_fields',
  description: `Retrieve the field definitions for a NiftyImages Data Store. Returns the available field names and types, which can then be used when adding or updating records.
Requires the **Data Store API Key** (found under Data Sources > choose a Data Store > "Use Our API").`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dataStoreApiKey: z
        .string()
        .describe(
          'The API Key for the specific Data Store (found under Data Sources > Data Store > "Use Our API").'
        )
    })
  )
  .output(
    z.object({
      fields: z.array(z.any()).describe('The list of field definitions for the Data Store.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let fields = await client.getDataStoreFields(ctx.input.dataStoreApiKey);

    return {
      output: { fields },
      message: `Retrieved **${Array.isArray(fields) ? fields.length : 0}** field(s) from the Data Store.`
    };
  })
  .build();
