import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let listSignerProfiles = SlateTool.create(spec, {
  name: 'List Signer Profiles',
  key: 'list_signer_profiles',
  description: `Retrieve available signer profiles and their required inputs. Signer profiles define what identity information is needed to create a signer. Use this to understand what inputs are required before creating signers.`,
  instructions: [
    'Provide a signerProfileId to get the specific input fields required for that profile.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      signerProfileId: z
        .string()
        .optional()
        .describe('If provided, also fetches the specific input requirements for this profile')
    })
  )
  .output(
    z.object({
      signerProfiles: z.array(z.any()).describe('List of available signer profiles'),
      inputsNeeded: z
        .any()
        .optional()
        .describe('Required inputs for the specified signer profile')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let profiles = await client.listSignerProfiles();
    let list = Array.isArray(profiles) ? profiles : [];

    let inputsNeeded: any;
    if (ctx.input.signerProfileId) {
      inputsNeeded = await client.getSignerProfileInputsNeeded(ctx.input.signerProfileId);
    }

    return {
      output: {
        signerProfiles: list,
        inputsNeeded
      },
      message: `Found **${list.length}** signer profile(s)${ctx.input.signerProfileId ? ` (with input requirements for profile ${ctx.input.signerProfileId})` : ''}.`
    };
  })
  .build();
