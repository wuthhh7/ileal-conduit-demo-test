import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  lineUserId: text('line_user_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  urgency: text('urgency').notNull().default('green'),
  status: text('status').notNull().default('awaiting_staff'),
  age: integer('age'),
  procedure: text('procedure'),
  dischargeDay: integer('discharge_day'),
  intakeField: text('intake_field'),
  intakeJson: text('intake_json').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: text('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  body: text('body').notNull(),
  reason: text('reason'),
  createdAt: text('created_at').notNull(),
});

export const assessments = sqliteTable('assessments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  overall: integer('overall').notNull(),
  ease: integer('ease').notNull(),
  usefulness: integer('usefulness').notNull(),
  comment: text('comment'),
  createdAt: text('created_at').notNull(),
});
