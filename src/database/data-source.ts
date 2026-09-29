/**
 * TypeORM DataSource used by the migration CLI (migration:run / migration:revert).
 * Not used at runtime — AppModule uses TypeOrmModule.forRootAsync instead.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  synchronize: false,
  migrations: [join(__dirname, '../../migrations/*.ts')],
  entities: [join(__dirname, '../**/*.entity.ts')],
});
