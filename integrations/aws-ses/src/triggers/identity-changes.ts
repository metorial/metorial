import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

export let identityChanges = SlateTrigger.create(spec, {
  name: 'Identity Verification Changes',
  key: 'identity_changes',
  description:
    'Polls for changes in email identity verification status. Detects newly verified or updated identities (email addresses and domains).'
})
  .input(
    z.object({
      identityName: z.string().describe('Identity email address or domain'),
      identityType: z.string().describe('Identity type (EMAIL_ADDRESS or DOMAIN)'),
      sendingEnabled: z.boolean().describe('Whether sending is enabled'),
      verificationStatus: z.string().optional().describe('Current verification status')
    })
  )
  .output(
    z.object({
      identityName: z.string().describe('Email address or domain'),
      identityType: z.string().describe('Type of identity'),
      sendingEnabled: z.boolean().describe('Whether the identity can send emails'),
      verificationStatus: z.string().optional().describe('Verification status')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SesClient({
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken,
        region: ctx.config.region
      });

      let previousIdentities = (ctx.state as any)?.identities as
        | Record<string, string>
        | undefined;
      let currentIdentities: Record<string, string> = {};
      let changedIdentities: {
        identityName: string;
        identityType: string;
        sendingEnabled: boolean;
        verificationStatus?: string;
      }[] = [];

      let nextToken: string | undefined;
      do {
        let result = await client.listEmailIdentities({ nextToken, pageSize: 100 });
        for (let identity of result.identities) {
          let key = identity.identityName;
          let stateStr = `${identity.sendingEnabled}-${identity.verificationStatus}`;
          currentIdentities[key] = stateStr;

          if (!previousIdentities || previousIdentities[key] !== stateStr) {
            changedIdentities.push(identity);
          }
        }
        nextToken = result.nextToken;
      } while (nextToken);

      return {
        inputs: changedIdentities,
        updatedState: {
          identities: currentIdentities
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.sendingEnabled ? 'verified' : 'updated';
      return {
        type: `identity.${eventType}`,
        id: `${ctx.input.identityName}-${ctx.input.verificationStatus || 'unknown'}-${Date.now()}`,
        output: {
          identityName: ctx.input.identityName,
          identityType: ctx.input.identityType,
          sendingEnabled: ctx.input.sendingEnabled,
          verificationStatus: ctx.input.verificationStatus
        }
      };
    }
  })
  .build();
