import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const catalogs=sqliteTable('catalogs',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull()});
