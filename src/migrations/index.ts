import * as migration_20260618_191419_initial from './20260618_191419_initial';
import * as migration_20260620_124603_programme from './20260620_124603_programme';
import * as migration_20260620_131912_pages from './20260620_131912_pages';
import * as migration_20260620_135644_seo from './20260620_135644_seo';

export const migrations = [
  {
    up: migration_20260618_191419_initial.up,
    down: migration_20260618_191419_initial.down,
    name: '20260618_191419_initial',
  },
  {
    up: migration_20260620_124603_programme.up,
    down: migration_20260620_124603_programme.down,
    name: '20260620_124603_programme',
  },
  {
    up: migration_20260620_131912_pages.up,
    down: migration_20260620_131912_pages.down,
    name: '20260620_131912_pages',
  },
  {
    up: migration_20260620_135644_seo.up,
    down: migration_20260620_135644_seo.down,
    name: '20260620_135644_seo'
  },
];
