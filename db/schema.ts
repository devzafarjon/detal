import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const catalogs=sqliteTable('catalogs',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull()});
export const aiScanUsage=sqliteTable('ai_scan_usage',{bucket:integer('bucket').primaryKey(),count:integer('count').notNull()});
