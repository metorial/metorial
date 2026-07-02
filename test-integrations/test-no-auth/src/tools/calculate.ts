import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let calculate = SlateTool.create(spec, {
  name: 'Calculate',
  key: 'calculate',
  description: `Perform a single arithmetic operation on two numbers: addition, subtraction, multiplication, or division.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      left: z.number().describe('Left-hand operand'),
      operator: z
        .enum(['add', 'subtract', 'multiply', 'divide'])
        .describe('Operation to apply'),
      right: z.number().describe('Right-hand operand')
    })
  )
  .output(
    z.object({
      result: z.number().describe('Numeric result of the operation')
    })
  )
  .handleInvocation(async ctx => {
    let { left, operator, right } = ctx.input;

    let result: number;
    switch (operator) {
      case 'add':
        result = left + right;
        break;
      case 'subtract':
        result = left - right;
        break;
      case 'multiply':
        result = left * right;
        break;
      case 'divide': {
        if (right === 0) {
          throw new Error('Division by zero is not allowed.');
        }
        result = left / right;
        break;
      }
    }

    return {
      output: { result },
      message: `**${left}** ${operator} **${right}** = **${result}**.`
    };
  })
  .build();
