import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const toolConfigs = sqliteTable("tool_configs", {
  name: text("name").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  paid: integer("paid", { mode: "boolean" }).notNull().default(true),
  price: text("price").notNull(),
  priceLabel: text("price_label").notNull(),
  scheme: text("scheme").notNull(),
  network: text("network").notNull(),
  payTo: text("pay_to").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const callLogs = sqliteTable("call_logs", {
  id: text("id").primaryKey(),
  toolName: text("tool_name").notNull(),
  paid: integer("paid", { mode: "boolean" }).notNull(),
  status: text("status").notNull(),
  httpStatus: integer("http_status").notNull(),
  price: text("price"),
  network: text("network"),
  payTo: text("pay_to"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});

export const aiProviders = sqliteTable("ai_providers", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull().default("inactive"),
  note: text("note").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const managedQuestions = sqliteTable("managed_questions", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  text: text("text").notNull(),
  attribute: text("attribute").notNull(),
  dimension: text("dimension").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  weightsJson: text("weights_json").notNull(),
  optionsJson: text("options_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type ToolConfig = typeof toolConfigs.$inferSelect;
export type NewToolConfig = typeof toolConfigs.$inferInsert;
export type NewCallLog = typeof callLogs.$inferInsert;
export type AiProvider = typeof aiProviders.$inferSelect;
export type NewAiProvider = typeof aiProviders.$inferInsert;
export type ManagedQuestion = typeof managedQuestions.$inferSelect;
export type NewManagedQuestion = typeof managedQuestions.$inferInsert;
