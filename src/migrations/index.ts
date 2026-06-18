import * as migration_20260618_191419_initial from './20260618_191419_initial';

export const migrations = [
  {
    up: migration_20260618_191419_initial.up,
    down: migration_20260618_191419_initial.down,
    name: '20260618_191419_initial'
  },
];
