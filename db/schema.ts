import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const catalogs=sqliteTable('catalogs',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull()});
export const aiScanUsage=sqliteTable('ai_scan_usage',{bucket:integer('bucket').primaryKey(),count:integer('count').notNull()});
export const drawings=sqliteTable('drawings',{id:integer('id').primaryKey(),name:text('name').notNull(),data:text('data').notNull(),partCount:integer('part_count').notNull(),revision:integer('revision').notNull(),deleted:integer('deleted').notNull().default(0)});
export const siteOwner=sqliteTable('site_owner',{id:integer('id').primaryKey(),userId:text('user_id').notNull()});
