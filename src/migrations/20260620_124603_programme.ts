import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "programme" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titel" varchar NOT NULL,
  	"karten_untertitel" varchar,
  	"bild_id" integer,
  	"programminhalt" jsonb,
  	"freitext" varchar,
  	"trailer_url" varchar,
  	"programm_pdf_url" varchar,
  	"position" numeric NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "programme_id" integer;
  ALTER TABLE "programme" ADD CONSTRAINT "programme_bild_id_media_id_fk" FOREIGN KEY ("bild_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "programme_titel_idx" ON "programme" USING btree ("titel");
  CREATE INDEX "programme_bild_idx" ON "programme" USING btree ("bild_id");
  CREATE INDEX "programme_position_idx" ON "programme" USING btree ("position");
  CREATE UNIQUE INDEX "programme_slug_idx" ON "programme" USING btree ("slug");
  CREATE INDEX "programme_updated_at_idx" ON "programme" USING btree ("updated_at");
  CREATE INDEX "programme_created_at_idx" ON "programme" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_programme_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programme"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_programme_id_idx" ON "payload_locked_documents_rels" USING btree ("programme_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "programme" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "programme" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_programme_fk";
  
  DROP INDEX "payload_locked_documents_rels_programme_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "programme_id";`)
}
