import * as migration_20261109_022820_baseline from './20261109_022820_baseline';

export const migrations = [
  {
    up: migration_20261109_022820_baseline.up,
    down: migration_20261109_022820_baseline.down,
    name: '20261109_022820_baseline'
  },
];
