import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const classes = sqliteTable('classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  age: text('age').notNull(),
  className: text('class_name').notNull(),
});

export const children = sqliteTable('children', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  birthdate: text('birthdate').notNull(), // ISO date string
  classId: integer('class_id').references(() => classes.id).notNull(),
});

export const observationLogs = sqliteTable('observation_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').references(() => children.id).notNull(),
  month: text('month').notNull(), // ISO date string (first day of month)
  keywords: text('keywords').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

export const developmentEvaluations = sqliteTable('development_evaluations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').references(() => children.id).notNull(),
  period: text('period').notNull(),
  overallCharacteristics: text('overall_characteristics').notNull(),
  parentMessage: text('parent_message').notNull(),
  observations: text('observations').notNull(), // aggregated from logs
  ageAtEvaluation: text('age_at_evaluation').notNull(), // calculated months
  createdAt: text('created_at').notNull(),
});

export const activityPlans = sqliteTable('activity_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  classId: integer('class_id').references(() => classes.id).notNull(),
  theme: text('theme').notNull(),
  startDate: text('start_date').notNull(), // ISO date string
  endDate: text('end_date').notNull(), // ISO date string
  age: text('age').notNull(),
  plans: text('plans', { mode: 'json' }).notNull(), // JSON array of plan objects
  createdAt: text('created_at').notNull(),
});

export const childcareLogs = sqliteTable('childcare_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  classId: integer('class_id').references(() => classes.id).notNull(),
  date: text('date').notNull(), // ISO date string (YYYY-MM-DD)
  keywords: text('keywords').notNull(),
  evaluation: text('evaluation').notNull(),
  supportPlan: text('support_plan').notNull(),
  schedule: text('schedule', { mode: 'json' }), // JSON array of daily activities
  evaluationContent: text('evaluation_content'), // New field for generated/edited evaluation
  createdAt: text('created_at').notNull(),
});

export const dailyChildObservations = sqliteTable('daily_child_observations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  classId: integer('class_id').references(() => classes.id).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD format
  childId: integer('child_id').references(() => children.id).notNull(),
  observation: text('observation').notNull(),
  createdAt: text('created_at').notNull(),
});

export const observations = sqliteTable('observations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').references(() => children.id).notNull(),
  userId: text('user_id'), // Optional for future auth integration
  date: text('date').notNull(), // ISO date string YYYY-MM-DD
  time: text('time'), // Time string HH:MM
  domain: text('domain', { 
    enum: ['전반', '신체', '의사소통', '사회', '예술', '자연'] 
  }).notNull(),
  tags: text('tags', { mode: 'json' }).default('[]'), // JSON array of strings
  summary: text('summary').notNull(),
  detail: text('detail'),
  media: text('media', { mode: 'json' }).default('[]'), // JSON array of media objects
  author: text('author').notNull(), // e.g., "이슬반_김교사"
  followUps: text('follow_ups', { mode: 'json' }).default('[]'), // JSON array of strings
  linkedToReport: integer('linked_to_report', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});