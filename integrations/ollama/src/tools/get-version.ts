import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVersion = SlateTool.create(spec, {
  name: 'Get Version',
  key: 'get_version',
  description: 'Retrieve the Ollama server version for health and compatibility checks.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      version: z.string().describe('Ollama server version.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.getVersion();

    return {
      output: result,
      message: `Ollama version **${result.version}**.`
    };
  })
  .build();
