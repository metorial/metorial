import { SlateTool } from 'slates';
import { z } from 'zod';
import { jsonPlaceholderAxios } from '../clients';
import { spec } from '../spec';

export let getTodo = SlateTool.create(spec, {
  name: 'Get Todo',
  key: 'get_todo',
  description: `Fetch a sample todo from JSONPlaceholder (https://jsonplaceholder.typicode.com). IDs 1–200 are valid.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.number().int().min(1).max(200).default(1).describe('Todo ID (1–200).')
    })
  )
  .output(
    z.object({
      userId: z.number(),
      id: z.number(),
      title: z.string(),
      completed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let response = await jsonPlaceholderAxios.get(`/todos/${ctx.input.id}`);
    let data = response.data;

    let output = {
      userId: Number(data?.userId ?? 0),
      id: Number(data?.id ?? ctx.input.id),
      title: String(data?.title ?? ''),
      completed: Boolean(data?.completed ?? false)
    };

    return {
      output,
      message: `Todo **#${output.id}** (user **${output.userId}**) — ${output.completed ? '✓' : '◻'} *${output.title}*`
    };
  })
  .build();
