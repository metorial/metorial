import { Client } from './client';

export let createClient = (auth: {
  token: string;
  authMethod: 'oauth' | 'digest';
  publicKey?: string;
  privateKey?: string;
}): Client => {
  return new Client({
    token: auth.token,
    authMethod: auth.authMethod,
    publicKey: auth.publicKey,
    privateKey: auth.privateKey
  });
};
