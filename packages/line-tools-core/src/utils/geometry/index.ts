// /src/utils/geometry/index.ts
// Barrel for the split geometry utilities. Replaces the former single-file `src/utils/geometry.ts`.
// Importers that reference `'../utils/geometry'` (or `'./geometry'`) resolve to this module.

export * from './point';
export * from './intersections';
export * from './polygon';
export * from './time';
export * from './scale';
