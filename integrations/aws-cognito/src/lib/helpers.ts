// Helper to create a CognitoClient from context
import { CognitoClient } from './client';
import { CognitoIdentityClient } from './identity-client';

export let createCognitoClient = (ctx: {
  config: { region: string };
  auth: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
}) => {
  return new CognitoClient({
    region: ctx.config.region,
    accessKeyId: ctx.auth.accessKeyId,
    secretAccessKey: ctx.auth.secretAccessKey,
    sessionToken: ctx.auth.sessionToken
  });
};

export let createIdentityClient = (ctx: {
  config: { region: string };
  auth: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
}) => {
  return new CognitoIdentityClient({
    region: ctx.config.region,
    accessKeyId: ctx.auth.accessKeyId,
    secretAccessKey: ctx.auth.secretAccessKey,
    sessionToken: ctx.auth.sessionToken
  });
};

export let formatAttributes = (
  attrs: Array<{ Name: string; Value: string }>
): Record<string, string> => {
  let result: Record<string, string> = {};
  for (let attr of attrs) {
    result[attr.Name] = attr.Value;
  }
  return result;
};

export let toAttributeList = (
  attrs: Record<string, string>
): Array<{ Name: string; Value: string }> => {
  return Object.entries(attrs).map(([Name, Value]) => ({ Name, Value }));
};
