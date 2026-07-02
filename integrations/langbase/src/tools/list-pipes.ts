import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pipeSchema = z.object({
  pipeName: z.string().describe('Name of the pipe'),
  description: z.string().describe('Description of the pipe'),
  status: z.string().describe('Visibility status (public or private)'),
  ownerLogin: z.string().describe('Owner account login'),
  url: z.string().describe('URL of the pipe'),
  model: z.string().describe('LLM model used by the pipe'),
  stream: z.boolean().describe('Whether streaming is enabled'),
  store: z.boolean().describe('Whether conversation storage is enabled'),
  temperature: z.number().describe('Temperature setting'),
  maxTokens: z.number().describe('Max tokens setting')
});

export let listPipes = SlateTool.create(spec, {
  name: 'List Pipes',
  key: 'list_pipes',
  description: `List all AI pipes (agents) in your Langbase account. Returns configuration details for each pipe including the model, status, and settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      pipes: z.array(pipeSchema).describe('List of pipes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listPipes();

    let pipes = (Array.isArray(result) ? result : []).map((p: any) => ({
      pipeName: p.name ?? '',
      description: p.description ?? '',
      status: p.status ?? 'private',
      ownerLogin: p.owner_login ?? '',
      url: p.url ?? '',
      model: p.model ?? '',
      stream: p.stream ?? false,
      store: p.store ?? false,
      temperature: p.temperature ?? 0.7,
      maxTokens: p.max_tokens ?? 1000
    }));

    return {
      output: { pipes },
      message: `Found **${pipes.length}** pipe(s).`
    };
  })
  .build();
