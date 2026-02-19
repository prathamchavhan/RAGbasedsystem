-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Drop existing table and function
drop function if exists match_pdf_docs;
drop table if exists pdf_docs;

-- 2. Enable pgvector extension (should be enabled already, but good to check)
create extension if not exists vector;

-- 3. Create table with correct 768 dimensions for models/gemini-embedding-001
create table pdf_docs (
  id bigint primary key generated always as identity,
  content text,
  metadata jsonb,
  embedding vector(3072)
);

-- 4. Create search function (RPC)
create or replace function match_pdf_docs (
  query_embedding vector(3072),
  match_count int DEFAULT 3,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  embedding vector(3072),
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    pdf_docs.id,
    pdf_docs.content,
    pdf_docs.metadata,
    pdf_docs.embedding,
    1 - (pdf_docs.embedding <=> query_embedding) as similarity
  from pdf_docs
  order by pdf_docs.embedding <=> query_embedding
  limit match_count;
end;
$$;
