import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let updateSigner = SlateTool.create(spec, {
  name: 'Update Signer',
  key: 'update_signer',
  description: `Update an existing signer's inputs (claims) such as name, email, phone number, or other identity attributes. Can also be used to revoke a signer.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      signerId: z.string().describe('ID of the signer to update'),
      revoke: z
        .boolean()
        .optional()
        .describe('If true, revoke the signer instead of updating'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      phoneNumber: z.string().optional().describe('Updated phone number'),
      nationality: z.string().optional().describe('Updated nationality'),
      birthDate: z.string().optional().describe('Updated birth date'),
      birthPlace: z.string().optional().describe('Updated birth place'),
      birthCountry: z.string().optional().describe('Updated birth country')
    })
  )
  .output(
    z.object({
      signerId: z.string().describe('Signer ID'),
      revoked: z.boolean().optional().describe('Whether the signer was revoked'),
      result: z.any().optional().describe('API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    if (ctx.input.revoke) {
      let result = await client.revokeSigner(ctx.input.signerId);
      return {
        output: {
          signerId: ctx.input.signerId,
          revoked: true,
          result
        },
        message: `Signer **${ctx.input.signerId}** has been revoked.`
      };
    }

    let updateData: Record<string, any> = {};
    if (ctx.input.firstName) updateData.firstName = ctx.input.firstName;
    if (ctx.input.lastName) updateData.lastName = ctx.input.lastName;
    if (ctx.input.email) updateData.email = ctx.input.email;
    if (ctx.input.phoneNumber) updateData.phoneNumber = ctx.input.phoneNumber;
    if (ctx.input.nationality) updateData.nationality = ctx.input.nationality;
    if (ctx.input.birthDate) updateData.birthDate = ctx.input.birthDate;
    if (ctx.input.birthPlace) updateData.birthPlace = ctx.input.birthPlace;
    if (ctx.input.birthCountry) updateData.birthCountry = ctx.input.birthCountry;

    let result = await client.updateSigner(ctx.input.signerId, updateData);

    return {
      output: {
        signerId: ctx.input.signerId,
        revoked: false,
        result
      },
      message: `Signer **${ctx.input.signerId}** updated successfully.`
    };
  })
  .build();
