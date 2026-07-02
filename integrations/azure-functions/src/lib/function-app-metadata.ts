export let getFunctionAppRuntimeStack = (properties: Record<string, any> | undefined) =>
  properties?.linuxFxVersion ||
  properties?.windowsFxVersion ||
  properties?.javaVersion ||
  properties?.nodeVersion ||
  properties?.pythonVersion ||
  properties?.powerShellVersion ||
  properties?.phpVersion ||
  properties?.netFrameworkVersion ||
  undefined;

export let getFunctionAppVersion = (properties: Record<string, any> | undefined) =>
  properties?.functionsExtensionVersion ||
  properties?.FUNCTIONS_EXTENSION_VERSION ||
  undefined;
