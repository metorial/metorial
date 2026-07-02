import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApiSpec = SlateTool.create(spec, {
  name: 'Get API Specification',
  key: 'get_api_spec',
  description: `Retrieve the auto-generated Swagger/OpenAPI specification for a Bubble application. This dynamically reflects all exposed data types, their fields, and available API workflows. Useful for discovering available data types and their schemas.`,
  instructions: ['The Swagger spec must be enabled in Settings → API in the Bubble editor.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      specification: z
        .any()
        .describe(
          'The OpenAPI/Swagger specification object describing all exposed data types and workflows.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.appBaseUrl,
      token: ctx.auth?.token
    });

    let specification = await client.getSwaggerSpec();

    return {
      output: {
        specification
      },
      message: `Retrieved the OpenAPI specification for the Bubble application.`
    };
  })
  .build();
