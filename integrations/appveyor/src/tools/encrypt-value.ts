import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let encryptValue = SlateTool.create(spec, {
  name: 'Encrypt Value',
  key: 'encrypt_value',
  description: `Encrypt a sensitive value (such as a token, password, or API key) for safe use in appveyor.yml configuration files. The encrypted value can be used as a secure variable in YAML settings.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      plainValue: z.string().describe('The plain text value to encrypt')
    })
  )
  .output(
    z.object({
      encryptedValue: z.string().describe('The encrypted value for use in appveyor.yml')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let encryptedValue = await client.encryptValue(ctx.input.plainValue);

    return {
      output: { encryptedValue },
      message: `Encrypted the provided value. Use the encrypted value in your appveyor.yml as a secure variable.`
    };
  })
  .build();
