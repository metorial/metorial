import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let generatePassword = SlateTool.create(spec, {
  name: 'Generate Password',
  key: 'generate_password',
  description: `Generate a secure password using 1Password's password generator. Creates a temporary PASSWORD item in the specified vault with a generated password field, retrieves the generated value, then deletes the temporary item. Supports configuring length, character sets, and excluded characters.`,
  constraints: [
    'Requires a vault to temporarily store the generated password item.',
    'The temporary item is automatically deleted after the password is retrieved.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      vaultId: z.string().describe('ID of the vault to use for temporary password generation'),
      length: z
        .number()
        .min(1)
        .max(64)
        .default(32)
        .describe('Length of the generated password (1-64, default 32)'),
      characterSets: z
        .array(z.enum(['LETTERS', 'DIGITS', 'SYMBOLS']))
        .optional()
        .describe(
          'Character sets to include. Each set listed guarantees at least one character of that type. Defaults to LETTERS and DIGITS.'
        ),
      excludeCharacters: z
        .string()
        .optional()
        .describe(
          'Characters to exclude from the generated password (e.g., "lI0O" to avoid ambiguous characters)'
        )
    })
  )
  .output(
    z.object({
      password: z.string().describe('The generated password'),
      length: z.number().describe('Length of the generated password'),
      characterSets: z.array(z.string()).describe('Character sets used in generation')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.connectServerUrl) {
      throw new Error('Connect server URL is required. Set it in the configuration.');
    }

    let client = new ConnectClient({
      token: ctx.auth.token,
      serverUrl: ctx.config.connectServerUrl
    });

    let charSets = ctx.input.characterSets || ['LETTERS', 'DIGITS'];

    ctx.progress('Generating password...');

    let tempItem = await client.createItem(ctx.input.vaultId, {
      vault: { id: ctx.input.vaultId },
      title: `_temp_password_gen_${Date.now()}`,
      category: 'PASSWORD',
      fields: [
        {
          label: 'password',
          type: 'CONCEALED',
          purpose: 'PASSWORD',
          generate: true,
          recipe: {
            length: ctx.input.length,
            characterSets: charSets,
            ...(ctx.input.excludeCharacters
              ? { excludeCharacters: ctx.input.excludeCharacters }
              : {})
          } as any
        }
      ]
    });

    let passwordField = (tempItem.fields || []).find(f => f.purpose === 'PASSWORD');
    let password = passwordField?.value || '';

    try {
      await client.deleteItem(ctx.input.vaultId, tempItem.id);
    } catch (_e) {
      ctx.warn(
        'Failed to clean up temporary password item. You may want to delete it manually.'
      );
    }

    return {
      output: {
        password,
        length: password.length,
        characterSets: charSets
      },
      message: `Generated a **${password.length}-character** password using character sets: ${charSets.join(', ')}.`
    };
  })
  .build();
