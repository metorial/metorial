import { SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import {
  array,
  optionalStrings,
  optionalText,
  record,
  stringRecord,
  text
} from '../lib/response';
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
      rawMetadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Unmodified package or version metadata, including all provider fields'),
      packageName: z.string().describe('Package name'),
      description: z.string().optional().describe('Package description'),
      latestVersion: z.string().optional().describe('Latest published version'),
      license: z.string().optional().describe('License identifier'),
      homepage: z.string().optional().describe('Project homepage URL'),
      repository: z.any().optional().describe('Source repository information'),
      maintainers: z
        .array(
          z.object({
            name: z.string().optional(),
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
      let versionData = record(
        await client.getPackageVersion(ctx.input.packageName, ctx.input.version),
        'package version'
      );
      let version = mapVersion(versionData);
      return {
        output: {
          ...mapPackage(versionData),
          latestVersion: version.version,
          requestedVersion: version,
          rawMetadata: versionData
        },
        message: `Retrieved metadata for **${version.name}@${version.version}**.`
      };
    }

    let metadata = record(
      await client.getPackageMetadata(ctx.input.packageName, {
        abbreviated: ctx.input.abbreviated
      }),
      'package metadata'
    );
    let versionRecords = record(metadata.versions, 'package versions');
    let versions = Object.values(versionRecords).map(value =>
      mapVersion(record(value, 'package version'))
    );
    let distTags =
      metadata['dist-tags'] == null
        ? undefined
        : stringRecord(metadata['dist-tags'], 'distribution tags');
    return {
      output: {
        ...mapPackage(metadata),
        latestVersion: distTags?.latest,
        distTags,
        versions,
        time:
          metadata.time == null ? undefined : stringRecord(metadata.time, 'publication dates'),
        rawMetadata: metadata
      },
      message: `Retrieved metadata for **${text(metadata.name, 'package name')}** with ${versions.length} version(s).`
    };
  })
  .build();

function mapPackage(value: Record<string, unknown>) {
  return {
    packageName: text(value.name, 'package name'),
    description: optionalText(value.description, 'package description'),
    license: mapLicense(value.license),
    homepage: optionalText(value.homepage, 'package homepage'),
    repository: value.repository,
    maintainers:
      value.maintainers == null
        ? undefined
        : array(value.maintainers, 'package maintainers').map(item => {
            let maintainer = record(item, 'package maintainer');
            return {
              name: optionalText(maintainer.name, 'maintainer name'),
              email: optionalText(maintainer.email, 'maintainer email')
            };
          }),
    keywords: optionalStrings(value.keywords, 'package keywords')
  };
}

function mapLicense(value: unknown): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'string'
    ? value
    : optionalText(record(value, 'package license').type, 'license type');
}

function mapVersion(value: Record<string, unknown>) {
  let dist = value.dist == null ? undefined : record(value.dist, 'package distribution');
  return {
    ...value,
    version: text(value.version, 'package version'),
    name: text(value.name, 'version package name'),
    description: optionalText(value.description, 'version description'),
    main: optionalText(value.main, 'package entry point'),
    license: mapLicense(value.license),
    homepage: optionalText(value.homepage, 'version homepage'),
    repository: value.repository,
    dependencies:
      value.dependencies == null
        ? undefined
        : stringRecord(value.dependencies, 'runtime dependencies'),
    devDependencies:
      value.devDependencies == null
        ? undefined
        : stringRecord(value.devDependencies, 'development dependencies'),
    peerDependencies:
      value.peerDependencies == null
        ? undefined
        : stringRecord(value.peerDependencies, 'peer dependencies'),
    engines:
      value.engines == null ? undefined : stringRecord(value.engines, 'engine requirements'),
    deprecated: optionalText(value.deprecated, 'deprecation message'),
    dist: dist
      ? {
          tarball: optionalText(dist.tarball, 'tarball URL'),
          shasum: optionalText(dist.shasum, 'tarball SHA1'),
          integrity: optionalText(dist.integrity, 'tarball integrity')
        }
      : undefined
  };
}
