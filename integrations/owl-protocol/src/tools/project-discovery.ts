import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  OwlClient,
  type OwlRecord,
  owlNumber,
  owlObject,
  owlString,
  requireChainId,
  requireInput,
  requireOwlString,
  userLookup
} from '../lib/client';
import { listInputSchema, rawSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Current Project',
  key: 'get_project',
  description:
    'Identify the project associated with the connected API key, including its name, team ID, slug, and default blockchain chain ID.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().describe('Project name.'),
      slug: z.string().describe('Project slug.'),
      teamId: z.string().describe('Team that owns the project.'),
      defaultChainId: z.number().describe('Default blockchain network chain ID.'),
      description: z.string().optional().describe('Project description.'),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await new OwlClient({ token: ctx.auth.token }).getProject();
    let defaultChainId = owlNumber(result.defaultChainId);
    if (defaultChainId === undefined) {
      throw createApiServiceError(
        'Owl Protocol returned a project without a valid defaultChainId.',
        {
          reason: 'owl_protocol_invalid_response'
        }
      );
    }
    return {
      output: {
        name: requireOwlString(result.name, 'project name'),
        slug: requireOwlString(result.slug, 'project slug'),
        teamId: requireOwlString(result.teamId, 'project team ID'),
        defaultChainId,
        description: owlString(result.description),
        raw: result
      },
      message: 'Retrieved the project associated with this API key.'
    };
  })
  .build();

let contractOutputSchema = z.object({
  chainId: z.number().describe('Blockchain network chain ID.'),
  contractAddress: z.string().describe('Deployed contract address.'),
  contractName: z.string().describe('Contract implementation name.'),
  projectId: z.string().optional().describe('Project ID.'),
  createdAt: z.number().optional().describe('Provider creation timestamp.'),
  contractTx: z.string().optional().describe('Contract transaction identifier.'),
  deployParams: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Deployment parameters.'),
  raw: rawSchema
});

let mapContract = (result: OwlRecord) => {
  let chainId = owlNumber(result.chainId);
  if (chainId === undefined) {
    throw createApiServiceError('Owl Protocol returned a contract without a valid chainId.', {
      reason: 'owl_protocol_invalid_response'
    });
  }
  return {
    chainId,
    contractAddress: requireOwlString(result.address, 'contract address'),
    contractName: requireOwlString(result.contractName, 'contract implementation name'),
    projectId: owlString(result.projectId),
    createdAt: owlNumber(result.createdAt),
    contractTx: owlString(result.contractTx),
    deployParams: owlObject(result.deployParams),
    raw: result
  };
};

export let listProjectContracts = SlateTool.create(spec, {
  name: 'List Project Contracts',
  key: 'list_project_contracts',
  description:
    'Discover a page of deployed project contracts with their blockchain chain IDs and contract addresses. Use these identifiers with get_contract, mint_tokens, and the contract metadata tools.',
  tags: { readOnly: true, destructive: false }
})
  .input(listInputSchema)
  .output(z.object({ contracts: z.array(contractOutputSchema), raw: rawSchema }))
  .handleInvocation(async ctx => {
    let result = await new OwlClient({ token: ctx.auth.token }).listProjectContracts(
      ctx.input
    );
    return {
      output: { contracts: result.map(mapContract), raw: result },
      message: `Retrieved ${result.length} project contract(s) in this page.`
    };
  })
  .build();

export let getContract = SlateTool.create(spec, {
  name: 'Get Project Contract',
  key: 'get_contract',
  description:
    'Retrieve a deployed project contract record and deployment parameters. Call list_project_contracts to discover its contractAddress and chainId.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      chainId: z.number().describe('Blockchain chain ID from list_project_contracts.'),
      contractAddress: z.string().describe('Contract address from list_project_contracts.')
    })
  )
  .output(contractOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new OwlClient({ token: ctx.auth.token }).getContract({
      chainId: requireChainId(ctx.input.chainId),
      contractAddress: requireInput(ctx.input.contractAddress, 'contractAddress')
    });
    return { output: mapContract(result), message: 'Retrieved the project contract record.' };
  })
  .build();

export let listUserTokens = SlateTool.create(spec, {
  name: 'List User Tokens',
  key: 'list_user_tokens',
  description:
    'List project tokens belonging to a user identified by email, externalId, or userId. Call list_users to discover users. If several selectors are supplied, email takes precedence, then externalId, then userId.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      email: z.string().optional().describe('User email from list_users.'),
      externalId: z.string().optional().describe('External identifier from list_users.'),
      userId: z.string().optional().describe('User ID from list_users.')
    })
  )
  .output(
    z.object({
      tokens: z.array(
        z.object({
          chainId: z.number().describe('Blockchain network chain ID.'),
          contractAddress: z.string().describe('Token collection contract address.'),
          tokenId: z.string().describe('Token ID.'),
          metadata: z.record(z.string(), z.unknown()).optional().describe('Token metadata.')
        })
      ),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await new OwlClient({ token: ctx.auth.token }).listUserTokens(
      userLookup(ctx.input)
    );
    let tokens = result.map(token => {
      let chainId = owlNumber(token.chainId);
      if (chainId === undefined) {
        throw createApiServiceError('Owl Protocol returned a token without a valid chainId.', {
          reason: 'owl_protocol_invalid_response'
        });
      }
      return {
        chainId,
        contractAddress: requireOwlString(token.address, 'token contract address'),
        tokenId: requireOwlString(token.tokenId, 'token ID'),
        metadata: owlObject(token.metadata)
      };
    });
    return {
      output: { tokens, raw: result },
      message: `Retrieved ${tokens.length} project token(s) for the user.`
    };
  })
  .build();
