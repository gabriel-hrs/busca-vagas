import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
  owner: text('owner').notNull(), key: text('key').notNull(), value: text('value').notNull(), updatedAt: text('updated_at').notNull(),
}, (table) => [primaryKey({ columns: [table.owner, table.key] })]);
export const feeds = sqliteTable('feeds', {
  source: text('source').primaryKey(), value: text('value').notNull(), updatedAt: text('updated_at').notNull(),
});
