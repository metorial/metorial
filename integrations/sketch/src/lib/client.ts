// Sketch file format utilities
// Sketch documents are ZIP archives containing JSON files.
// This module provides helpers for working with the JSON data structures
// that comprise a Sketch document.

export type SketchColor = {
  _class: 'color';
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

export type SketchRect = {
  _class: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  constrainProportions: boolean;
};

export type SketchStyle = {
  _class: 'style';
  do_objectID?: string;
  fills?: Array<{
    _class: 'fill';
    isEnabled: boolean;
    fillType: number;
    color?: SketchColor;
  }>;
  borders?: Array<{
    _class: 'border';
    isEnabled: boolean;
    color?: SketchColor;
    thickness: number;
    position: number;
  }>;
  textStyle?: {
    _class: 'textStyle';
    encodedAttributes?: Record<string, unknown>;
  };
  contextSettings?: {
    _class: 'graphicsContextSettings';
    opacity: number;
    blendMode: number;
  };
};

export type SketchLayerClass =
  | 'artboard'
  | 'bitmap'
  | 'group'
  | 'oval'
  | 'page'
  | 'polygon'
  | 'rectangle'
  | 'shapePath'
  | 'shapeGroup'
  | 'slice'
  | 'star'
  | 'symbolInstance'
  | 'symbolMaster'
  | 'text'
  | 'triangle'
  | 'MSImmutableHotspotLayer';

export type SketchLayer = {
  _class: SketchLayerClass;
  do_objectID: string;
  name: string;
  isVisible: boolean;
  isLocked: boolean;
  isFlippedHorizontal?: boolean;
  isFlippedVertical?: boolean;
  rotation?: number;
  frame?: SketchRect;
  style?: SketchStyle;
  layers?: SketchLayer[];
  symbolID?: string;
  overrideValues?: Array<{
    _class: 'overrideValue';
    overrideName: string;
    value: unknown;
  }>;
  attributedString?: {
    _class: 'attributedString';
    string: string;
    attributes?: unknown[];
  };
  [key: string]: unknown;
};

export type SketchPage = SketchLayer & {
  _class: 'page';
  layers: SketchLayer[];
};

export type SketchSharedStyle = {
  _class: 'sharedStyle';
  do_objectID: string;
  name: string;
  value: SketchStyle;
};

export type SketchDocumentJson = {
  _class: 'document';
  do_objectID: string;
  colorSpace?: number;
  currentPageIndex?: number;
  assets?: {
    _class: 'assetCollection';
    do_objectID?: string;
    colorAssets?: Array<{
      _class: 'MSImmutableColorAsset';
      do_objectID?: string;
      name?: string;
      color: SketchColor;
    }>;
    gradientAssets?: unknown[];
    imageCollection?: {
      _class: 'imageCollection';
      images: Record<string, unknown>;
    };
    colors?: SketchColor[];
    gradients?: unknown[];
    images?: unknown[];
  };
  foreignLayerStyles?: unknown[];
  foreignSymbols?: unknown[];
  foreignTextStyles?: unknown[];
  layerStyles?: {
    _class: 'sharedStyleContainer';
    do_objectID?: string;
    objects?: SketchSharedStyle[];
  };
  layerTextStyles?: {
    _class: 'sharedTextStyleContainer';
    do_objectID?: string;
    objects?: SketchSharedStyle[];
  };
  layerSymbols?: {
    _class: 'symbolContainer';
    do_objectID?: string;
    objects?: unknown[];
  };
  pages?: Array<{
    _class: 'MSJSONFileReference';
    _ref_class: 'MSImmutablePage';
    _ref: string;
  }>;
  [key: string]: unknown;
};

export type SketchMetaJson = {
  commit: string;
  pagesAndArtboards: Record<
    string,
    {
      name: string;
      artboards: Record<string, { name: string }>;
    }
  >;
  version: number;
  compatibilityVersion?: number;
  app: string;
  appVersion: string;
  variant: string;
  created: {
    commit: string;
    appVersion: string;
    build: number;
    app: string;
    compatibilityVersion: number;
    version: number;
    variant: string;
  };
  fonts?: string[];
  [key: string]: unknown;
};

export type SketchUserJson = {
  document?: {
    pageListHeight?: number;
    pageListCollapsed?: number;
  };
  [pageId: string]: unknown;
};

export let colorToHex = (color: SketchColor): string => {
  let r = Math.round(color.red * 255)
    .toString(16)
    .padStart(2, '0');
  let g = Math.round(color.green * 255)
    .toString(16)
    .padStart(2, '0');
  let b = Math.round(color.blue * 255)
    .toString(16)
    .padStart(2, '0');
  let a = Math.round(color.alpha * 255)
    .toString(16)
    .padStart(2, '0');
  if (a === 'ff') {
    return `#${r}${g}${b}`.toUpperCase();
  }
  return `#${r}${g}${b}${a}`.toUpperCase();
};

export let colorToRgba = (color: SketchColor): string => {
  let r = Math.round(color.red * 255);
  let g = Math.round(color.green * 255);
  let b = Math.round(color.blue * 255);
  return `rgba(${r}, ${g}, ${b}, ${Number.parseFloat(color.alpha.toFixed(2))})`;
};

export let extractColorsFromStyle = (style: SketchStyle | undefined): SketchColor[] => {
  let colors: SketchColor[] = [];
  if (!style) return colors;

  if (style.fills) {
    for (let fill of style.fills) {
      if (fill.isEnabled && fill.color) {
        colors.push(fill.color);
      }
    }
  }

  if (style.borders) {
    for (let border of style.borders) {
      if (border.isEnabled && border.color) {
        colors.push(border.color);
      }
    }
  }

  return colors;
};

export let flattenLayers = (layers: SketchLayer[]): SketchLayer[] => {
  let result: SketchLayer[] = [];
  for (let layer of layers) {
    result.push(layer);
    if (layer.layers && layer.layers.length > 0) {
      result.push(...flattenLayers(layer.layers));
    }
  }
  return result;
};

export let findLayerById = (
  layers: SketchLayer[],
  objectId: string
): SketchLayer | undefined => {
  for (let layer of layers) {
    if (layer.do_objectID === objectId) {
      return layer;
    }
    if (layer.layers) {
      let found = findLayerById(layer.layers, objectId);
      if (found) return found;
    }
  }
  return undefined;
};

export let findLayersByName = (layers: SketchLayer[], name: string): SketchLayer[] => {
  let results: SketchLayer[] = [];
  for (let layer of layers) {
    if (layer.name === name) {
      results.push(layer);
    }
    if (layer.layers) {
      results.push(...findLayersByName(layer.layers, name));
    }
  }
  return results;
};

export let findLayersByClass = (
  layers: SketchLayer[],
  layerClass: SketchLayerClass
): SketchLayer[] => {
  let results: SketchLayer[] = [];
  for (let layer of layers) {
    if (layer._class === layerClass) {
      results.push(layer);
    }
    if (layer.layers) {
      results.push(...findLayersByClass(layer.layers, layerClass));
    }
  }
  return results;
};

export let summarizeLayer = (layer: SketchLayer): Record<string, unknown> => {
  let summary: Record<string, unknown> = {
    layerClass: layer._class,
    objectId: layer.do_objectID,
    name: layer.name,
    isVisible: layer.isVisible,
    isLocked: layer.isLocked
  };

  if (layer.frame) {
    summary.frame = {
      x: layer.frame.x,
      y: layer.frame.y,
      width: layer.frame.width,
      height: layer.frame.height
    };
  }

  if (layer._class === 'text' && layer.attributedString) {
    summary.textContent = layer.attributedString.string;
  }

  if (layer._class === 'symbolInstance' && layer.symbolID) {
    summary.symbolId = layer.symbolID;
  }

  if (layer._class === 'symbolMaster' && layer.symbolID) {
    summary.symbolId = layer.symbolID;
  }

  if (layer.layers && layer.layers.length > 0) {
    summary.childCount = layer.layers.length;
  }

  return summary;
};

export let generateObjectId = (): string => {
  let chars = 'ABCDEF0123456789';
  let segments = [8, 4, 4, 4, 12];
  return segments
    .map(len => {
      let seg = '';
      for (let i = 0; i < len; i++) {
        seg += chars[Math.floor(Math.random() * chars.length)];
      }
      return seg;
    })
    .join('-');
};

export let createColor = (
  red: number,
  green: number,
  blue: number,
  alpha: number = 1
): SketchColor => ({
  _class: 'color',
  red: Math.max(0, Math.min(1, red)),
  green: Math.max(0, Math.min(1, green)),
  blue: Math.max(0, Math.min(1, blue)),
  alpha: Math.max(0, Math.min(1, alpha))
});

export let hexToColor = (hex: string): SketchColor => {
  let clean = hex.replace('#', '');
  let r = Number.parseInt(clean.substring(0, 2), 16) / 255;
  let g = Number.parseInt(clean.substring(2, 4), 16) / 255;
  let b = Number.parseInt(clean.substring(4, 6), 16) / 255;
  let a = clean.length >= 8 ? Number.parseInt(clean.substring(6, 8), 16) / 255 : 1;
  return createColor(r, g, b, a);
};

export let createRect = (x: number, y: number, width: number, height: number): SketchRect => ({
  _class: 'rect',
  x,
  y,
  width,
  height,
  constrainProportions: false
});

export let createStyle = (options?: {
  fillColor?: SketchColor;
  borderColor?: SketchColor;
  borderThickness?: number;
  opacity?: number;
}): SketchStyle => {
  let style: SketchStyle = {
    _class: 'style',
    do_objectID: generateObjectId()
  };

  if (options?.fillColor) {
    style.fills = [
      {
        _class: 'fill',
        isEnabled: true,
        fillType: 0,
        color: options.fillColor
      }
    ];
  }

  if (options?.borderColor) {
    style.borders = [
      {
        _class: 'border',
        isEnabled: true,
        color: options.borderColor,
        thickness: options?.borderThickness ?? 1,
        position: 1
      }
    ];
  }

  if (options?.opacity !== undefined) {
    style.contextSettings = {
      _class: 'graphicsContextSettings',
      opacity: options.opacity,
      blendMode: 0
    };
  }

  return style;
};

export let createLayer = (options: {
  layerClass: SketchLayerClass;
  name: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: SketchStyle;
  layers?: SketchLayer[];
  isVisible?: boolean;
}): SketchLayer => ({
  _class: options.layerClass,
  do_objectID: generateObjectId(),
  name: options.name,
  isVisible: options.isVisible ?? true,
  isLocked: false,
  isFlippedHorizontal: false,
  isFlippedVertical: false,
  rotation: 0,
  frame: createRect(
    options.x ?? 0,
    options.y ?? 0,
    options.width ?? 100,
    options.height ?? 100
  ),
  style: options.style ?? createStyle(),
  layers: options.layers
});

export let createArtboard = (options: {
  name: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  layers?: SketchLayer[];
}): SketchLayer =>
  createLayer({
    layerClass: 'artboard',
    name: options.name,
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 375,
    height: options.height ?? 812,
    layers: options.layers ?? []
  });

export let createPage = (options: { name: string; layers?: SketchLayer[] }): SketchPage => ({
  ...createLayer({
    layerClass: 'page',
    name: options.name,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    layers: options.layers ?? []
  }),
  _class: 'page' as const,
  layers: options.layers ?? []
});

export let createDocumentJson = (options: {
  pages: SketchPage[];
  sharedStyles?: SketchSharedStyle[];
  sharedTextStyles?: SketchSharedStyle[];
  colorAssets?: Array<{ name?: string; color: SketchColor }>;
}): SketchDocumentJson => ({
  _class: 'document',
  do_objectID: generateObjectId(),
  colorSpace: 0,
  currentPageIndex: 0,
  assets: {
    _class: 'assetCollection',
    do_objectID: generateObjectId(),
    colorAssets: options.colorAssets?.map(ca => ({
      _class: 'MSImmutableColorAsset' as const,
      do_objectID: generateObjectId(),
      name: ca.name,
      color: ca.color
    })),
    colors: options.colorAssets?.map(ca => ca.color) ?? [],
    gradientAssets: [],
    gradients: [],
    images: []
  },
  layerStyles: {
    _class: 'sharedStyleContainer',
    do_objectID: generateObjectId(),
    objects: options.sharedStyles ?? []
  },
  layerTextStyles: {
    _class: 'sharedTextStyleContainer',
    do_objectID: generateObjectId(),
    objects: options.sharedTextStyles ?? []
  },
  pages: options.pages.map(page => ({
    _class: 'MSJSONFileReference' as const,
    _ref_class: 'MSImmutablePage' as const,
    _ref: `pages/${page.do_objectID}`
  }))
});

export let createMetaJson = (options: {
  pages: SketchPage[];
  appVersion?: string;
}): SketchMetaJson => {
  let pagesAndArtboards: Record<
    string,
    { name: string; artboards: Record<string, { name: string }> }
  > = {};

  for (let page of options.pages) {
    let artboards: Record<string, { name: string }> = {};
    let artboardLayers = findLayersByClass(page.layers, 'artboard');
    for (let ab of artboardLayers) {
      artboards[ab.do_objectID] = { name: ab.name };
    }
    pagesAndArtboards[page.do_objectID] = {
      name: page.name,
      artboards
    };
  }

  return {
    commit: 'generated',
    pagesAndArtboards,
    version: 145,
    compatibilityVersion: 99,
    app: 'com.bohemiancoding.sketch3',
    appVersion: options.appVersion ?? '99.0',
    variant: 'NONAPPSTORE',
    created: {
      commit: 'generated',
      appVersion: options.appVersion ?? '99.0',
      build: 0,
      app: 'com.bohemiancoding.sketch3',
      compatibilityVersion: 99,
      version: 145,
      variant: 'NONAPPSTORE'
    },
    fonts: []
  };
};

export let collectAllColors = (
  pages: SketchPage[],
  documentJson?: SketchDocumentJson
): Array<{
  hex: string;
  rgba: string;
  source: string;
  layerName?: string;
}> => {
  let colors: Array<{ hex: string; rgba: string; source: string; layerName?: string }> = [];
  let seen = new Set<string>();

  let addColor = (color: SketchColor, source: string, layerName?: string) => {
    let hex = colorToHex(color);
    let key = `${hex}-${source}-${layerName ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      colors.push({
        hex,
        rgba: colorToRgba(color),
        source,
        layerName
      });
    }
  };

  if (documentJson?.assets?.colorAssets) {
    for (let ca of documentJson.assets.colorAssets) {
      addColor(ca.color, 'colorAsset', ca.name);
    }
  }

  if (documentJson?.assets?.colors) {
    for (let color of documentJson.assets.colors) {
      addColor(color, 'documentColor');
    }
  }

  if (documentJson?.layerStyles?.objects) {
    for (let style of documentJson.layerStyles.objects) {
      let styleColors = extractColorsFromStyle(style.value);
      for (let color of styleColors) {
        addColor(color, 'sharedLayerStyle', style.name);
      }
    }
  }

  if (documentJson?.layerTextStyles?.objects) {
    for (let style of documentJson.layerTextStyles.objects) {
      let styleColors = extractColorsFromStyle(style.value);
      for (let color of styleColors) {
        addColor(color, 'sharedTextStyle', style.name);
      }
    }
  }

  for (let page of pages) {
    let allLayers = flattenLayers(page.layers);
    for (let layer of allLayers) {
      let layerColors = extractColorsFromStyle(layer.style);
      for (let color of layerColors) {
        addColor(color, 'layer', layer.name);
      }
    }
  }

  return colors;
};

export let collectAllSymbols = (
  pages: SketchPage[]
): Array<{
  symbolId: string;
  objectId: string;
  name: string;
  pageName: string;
  width: number;
  height: number;
}> => {
  let symbols: Array<{
    symbolId: string;
    objectId: string;
    name: string;
    pageName: string;
    width: number;
    height: number;
  }> = [];

  for (let page of pages) {
    let masters = findLayersByClass(page.layers, 'symbolMaster');
    for (let master of masters) {
      symbols.push({
        symbolId: (master.symbolID as string) ?? master.do_objectID,
        objectId: master.do_objectID,
        name: master.name,
        pageName: page.name,
        width: master.frame?.width ?? 0,
        height: master.frame?.height ?? 0
      });
    }
  }

  return symbols;
};

export let collectTextContent = (
  pages: SketchPage[]
): Array<{
  objectId: string;
  layerName: string;
  textContent: string;
  pageName: string;
}> => {
  let texts: Array<{
    objectId: string;
    layerName: string;
    textContent: string;
    pageName: string;
  }> = [];

  for (let page of pages) {
    let textLayers = findLayersByClass(page.layers, 'text');
    for (let layer of textLayers) {
      if (layer.attributedString?.string) {
        texts.push({
          objectId: layer.do_objectID,
          layerName: layer.name,
          textContent: layer.attributedString.string,
          pageName: page.name
        });
      }
    }
  }

  return texts;
};
