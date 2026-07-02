import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let sumNumbers = SlateTool.create(spec, {
  name: 'Sum Numbers',
  key: 'sum_numbers',
  description: `Add together all numbers in a list and return the total. An empty list sums to zero.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      numbers: z.array(z.number()).describe('Numbers to sum')
    })
  )
  .output(
    z.object({
      sum: z.number().describe('Sum of all input numbers')
    })
  )
  .handleInvocation(async ctx => {
    let sum = ctx.input.numbers.reduce((acc, n) => acc + n, 0);
    let count = ctx.input.numbers.length;

    return {
      output: { sum },
      message:
        count === 0
          ? `Sum of an empty list is **0**.`
          : `Sum of **${count}** number${count === 1 ? '' : 's'} is **${sum}**.`
    };
  })
  .build();
