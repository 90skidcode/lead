import { AbstractPowerSyncDatabase, Schema, Table, Column, ColumnType } from '@powersync/web';

export const appSchema = new Schema({
  sync_test: new Table(
    {
      id: new Column({ name: 'id', type: ColumnType.TEXT }),
      name: new Column({ name: 'name', type: ColumnType.TEXT }),
      synced_at: new Column({ name: 'synced_at', type: ColumnType.TEXT }),
    },
    { name: 'sync_test' }
  ),
});

export async function initializePowerSync(db: AbstractPowerSyncDatabase) {
  await db.initialize(appSchema);
}

export { AbstractPowerSyncDatabase, Schema, Table, Column, ColumnType };
