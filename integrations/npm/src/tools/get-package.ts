import { SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import { spec } from '../spec';

let versionSchema = z
  .object({
    version: z.string().describe('Semver version string'),
    name: z.string().describe('Package name'),
    description: z.string().optional().describe('Version-specific description'),
    main: z.string().optional().describe('Entry point for the package'),
    license: z.string().optional().describe('License identifier'),
    homepage: z.string().optional().describe('Project homepage URL'),
    repository: z.any().optional().describe('Source repository information'),
    dependencies: z.record(z.string(), z.string()).optional().describe('Runtime dependencies'),
    devDependencies: z
      .record(z.string(), z.string())
      .optional()
      .describe('Development dependencies'),
    peerDependencies: z
      .record(z.string(), z.string())
      .optional()
      .describe('Peer dependencies'),
    engines: z
      .record(z.string(), z.string())
      .optional()
      .describe('Node/npm engine requirements'),
    deprecated: z.string().optional().describe('Deprecation message if version is deprecated'),
    dist: z
      .object({
        tarball: z.string().optional().describe('URL to the package tarball'),
        shasum: z.string().optional().describe('SHA1 hash of the tarball'),
        integrity: z.string().optional().describe('Subresource integrity hash')
      })
      .optional()
      .describe('Distribution information')
  })
  .passthrough();

export let getPackage = SlateTool.create(spec, {
  name: 'Get Package',
  key: 'get_package',
  description: `Retrieve metadata for an npm package, including its description, versions, maintainers, and repository info.
Optionally fetch a specific version or use abbreviated mode for smaller response payloads with only installation-relevant data.`,
  instructions: [
    'Use abbreviated mode when you only need dependency and version information to reduce payload size.',
    'Omit the version field to get the full package document with all versions.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      packageName: z
        .string()
        .describe(
          'Full package name, including scope if applicable (e.g. "react" or "@angular/core")'
        ),
      version: z
        .string()
        .optional()
        .describe(
          'Specific semver version to retrieve (e.g. "18.2.0"). Omit to get the full package document.'
        ),
      abbreviated: z
        .boolean()
        .optional()
        .describe(
          'If true, returns only installation-relevant metadata (much smaller payload). Ignored when a specific version is requested.'
        )
    })
  )
  .output(
    z.object({
      packageName: z.string().describe('Package name'),
      description: z.string().optional().describe('Package description'),
      latestVersion: z.string().optional().describe('Latest published version'),
      license: z.string().optional().describe('License identifier'),
      homepage: z.string().optional().describe('Project homepage URL'),
      repository: z.any().optional().describe('Source repository information'),
      maintainers: z
        .array(
          z.object({
            name: z.string(),
            email: z.string().optional()
          })
        )
        .optional()
        .describe('Package maintainers'),
      distTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Distribution tags mapping tag names to versions'),
      keywords: z.array(z.string()).optional().describe('Package keywords'),
      versions: z
        .array(versionSchema)
        .optional()
        .describe(
          'Available versions (present when fetching full metadata or a specific version)'
        ),
      requestedVersion: versionSchema
        .optional()
        .describe('The specific version requested, if a version was specified'),
      time: z
        .record(z.string(), z.string())
        .optional()
        .describe('Timestamps for each published version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NpmRegistryClient({ token: ctx.auth.token || undefined });

    if (ctx.input.version) {
      let versionData = await client.getPackageVersion(
        ctx.input.packageName,
        ctx.input.version
      );
      return {
        output: {
          packageName: versionData.name,
          description: versionData.description,
          latestVersion: versionData.version,
          license:
            typeof versionData.license === 'string'
              ? versionData.license
              : versionData.license?.type,
          homepage: versionData.homepage,
          repository: versionData.repository,
          maintainers: versionData.maintainers,
          keywords: versionData.keywords,
          requestedVersion: {
            version: versionData.version,
            name: versionData.name,
            description: versionData.description,
            main: versionData.main,
            license:
              typeof versionData.license === 'string'
                ? versionData.license
                : versionData.license?.type,
            homepage: versionData.homepage,
            repository: versionData.repository,
            dependencies: versionData.dependencies,
            devDependencies: versionData.devDependencies,
            peerDependencies: versionData.peerDependencies,
            engines: versionData.engines,
            deprecated: versionData.deprecated,
            dist: versionData.dist
              ? {
                  tarball: versionData.dist.tarball,
                  shasum: versionData.dist.shasum,
                  integrity: versionData.dist.integrity
                }
              : undefined
          }
        },
        message: `Retrieved metadata for **${versionData.name}@${versionData.version}**.`
      };
    }

    let metadata = await client.getPackageMetadata(ctx.input.packageName, {
      abbreviated: ctx.input.abbreviated
    });

    let latestVersion = metadata['dist-tags']?.latest;
    let versionKeys = metadata.versions ? Object.keys(metadata.versions) : [];

    let versions = ctx.input.abbreviated
      ? versionKeys.map((v: string) => {
          let vd = metadata.versions[v];
          return {
            version: v,
            name: metadata.name,
            dependencies: vd?.dependencies,
            devDependencies: vd?.devDependencies,
            peerDependencies: vd?.peerDependencies,
            engines: vd?.engines
          };
        })
      : versionKeys.slice(-20).map((v: string) => {
          let vd = metadata.versions[v];
          return {
            version: v,
            name: vd?.name || metadata.name,
            description: vd?.description,
            main: vd?.main,
            license: typeof vd?.license === 'string' ? vd.license : vd?.license?.type,
            homepage: vd?.homepage,
            repository: vd?.repository,
            dependencies: vd?.dependencies,
            devDependencies: vd?.devDependencies,
            peerDependencies: vd?.peerDependencies,
            engines: vd?.engines,
            deprecated: vd?.deprecated,
            dist: vd?.dist
              ? {
                  tarball: vd.dist.tarball,
                  shasum: vd.dist.shasum,
                  integrity: vd.dist.integrity
                }
              : undefined
          };
        });

    return {
      output: {
        packageName: metadata.name,
        description: metadata.description,
        latestVersion,
        license:
          typeof metadata.license === 'string' ? metadata.license : metadata.license?.type,
        homepage: metadata.homepage,
        repository: metadata.repository,
        maintainers: metadata.maintainers,
        distTags: metadata['dist-tags'],
        keywords: metadata.keywords,
        versions,
        time: metadata.time
      },
      message: `Retrieved metadata for **${metadata.name}**${latestVersion ? ` (latest: ${latestVersion})` : ''}. Found ${versionKeys.length} version(s).`
    };
  })
  .build();
