import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let utilitySecurity = SlateTool.create(spec, {
  name: 'Security Utilities',
  key: 'utility_security',
  description: `Perform security and cryptographic operations including AES encryption/decryption, RSA encryption/decryption, hash code generation (MD5, SHA1, SHA256, SHA384, SHA512), HMAC creation, JWT generation, and random password generation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'aes_encrypt',
          'aes_decrypt',
          'rsa_encrypt',
          'rsa_decrypt',
          'create_hash',
          'create_hmac',
          'create_jwt',
          'generate_password'
        ])
        .describe('Security operation to perform'),
      // AES params
      inputData: z.string().optional().describe('Data to encrypt/decrypt or hash'),
      aesKey: z.string().optional().describe('AES encryption key'),
      aesMode: z.string().optional().describe('AES mode (e.g., CBC, ECB)'),
      initializationVector: z.string().optional().describe('AES initialization vector'),
      padding: z.string().optional().describe('AES padding mode'),
      encodingMethod: z
        .string()
        .optional()
        .describe('Data encoding method (e.g., Base64, Hex)'),
      // RSA params
      rsaPublicKey: z.string().optional().describe('RSA public key (for encryption)'),
      rsaPrivateKey: z.string().optional().describe('RSA private key (for decryption)'),
      // Hash params
      hashAlgorithm: z
        .string()
        .optional()
        .describe('Hash algorithm (MD5, SHA1, SHA256, SHA384, SHA512)'),
      // HMAC params
      hmacKey: z.string().optional().describe('HMAC secret key'),
      // JWT params
      jwtPayload: z.string().optional().describe('JWT payload as JSON string'),
      jwtSecret: z.string().optional().describe('JWT signing secret'),
      // Password params
      passwordLength: z.number().optional().describe('Generated password length')
    })
  )
  .output(
    z.object({
      result: z
        .string()
        .describe('Operation result (encrypted/decrypted data, hash, token, password, etc.)'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;

    switch (ctx.input.operation) {
      case 'aes_encrypt':
        result = await client.utilityPost('AesEncryption', {
          data: ctx.input.inputData,
          key: ctx.input.aesKey,
          mode: ctx.input.aesMode || 'CBC',
          initializationVector: ctx.input.initializationVector,
          padding: ctx.input.padding,
          outputDataEncodingMethod: ctx.input.encodingMethod || 'Base64'
        });
        break;

      case 'aes_decrypt':
        result = await client.utilityPost('AesDecryption', {
          data: ctx.input.inputData,
          key: ctx.input.aesKey,
          mode: ctx.input.aesMode || 'CBC',
          initializationVector: ctx.input.initializationVector,
          padding: ctx.input.padding,
          inputDataEncodingMethod: ctx.input.encodingMethod || 'Base64'
        });
        break;

      case 'rsa_encrypt':
        result = await client.utilityPost('RsaEncryption', {
          data: ctx.input.inputData,
          publicKey: ctx.input.rsaPublicKey
        });
        break;

      case 'rsa_decrypt':
        result = await client.utilityPost('RsaDecryption', {
          data: ctx.input.inputData,
          privateKey: ctx.input.rsaPrivateKey
        });
        break;

      case 'create_hash':
        result = await client.utilityPost('CreateHashCodeV2', {
          data: ctx.input.inputData,
          hashAlgorithm: ctx.input.hashAlgorithm || 'SHA256'
        });
        break;

      case 'create_hmac':
        result = await client.utilityPost('CreateHMACV2', {
          data: ctx.input.inputData,
          key: ctx.input.hmacKey,
          hashAlgorithm: ctx.input.hashAlgorithm || 'SHA256'
        });
        break;

      case 'create_jwt':
        result = await client.utilityPost('CreateJWT', {
          payload: ctx.input.jwtPayload,
          secret: ctx.input.jwtSecret
        });
        break;

      case 'generate_password':
        result = await client.utilityPost('GeneratePassword', {
          length: ctx.input.passwordLength || 16
        });
        break;
    }

    return {
      output: {
        result:
          result.result ||
          result.Result ||
          result.data ||
          result.Data ||
          result.password ||
          result.Password ||
          result.token ||
          result.Token ||
          '',
        operationId: result.OperationId || ''
      },
      message: `Successfully performed **${ctx.input.operation.replace(/_/g, ' ')}**.`
    };
  })
  .build();
