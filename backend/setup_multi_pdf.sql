-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create Projects Table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on projects
alter table projects enable row level security;

-- Policies for projects: users can only see/edit their own projects
create policy "Users can view their own projects." on projects for select using (auth.uid() = user_id);
create policy "Users can insert their own projects." on projects for insert with check (auth.uid() = user_id);
create policy "Users can update their own projects." on projects for update using (auth.uid() = user_id);
create policy "Users can delete their own projects." on projects for delete using (auth.uid() = user_id);


-- 2. Modify existing pdf_docs table (Recreate it to add associations to avoid migration pain)
drop function if exists match_pdf_docs;
drop table if exists pdf_docs;

create table pdf_docs (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  filename text not null,
  content text,
  metadata jsonb,
  embedding vector(3072) -- Gemini embedding 001 dimension
);

-- Enable RLS on pdf_docs
alter table pdf_docs enable row level security;

-- Policies for pdf_docs: users can only see/edit documents in their own projects
create policy "Users can view docs in their projects." on pdf_docs for select using (auth.uid() = user_id);
create policy "Users can insert docs in their projects." on pdf_docs for insert with check (auth.uid() = user_id);
create policy "Users can read their docs." on pdf_docs for select using (auth.uid() = user_id);
create policy "Users can delete their docs." on pdf_docs for delete using (auth.uid() = user_id);


-- 3. Update the search function to filter by project_id and enforce user security
create or replace function match_pdf_docs (
  query_embedding vector(3072),
  target_project_id uuid,  -- New required parameter!
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
  where pdf_docs.project_id = target_project_id
    and pdf_docs.user_id = auth.uid() -- Enforce auth strictly at DB level
  order by pdf_docs.embedding <=> query_embedding
  limit match_count;
end;
$$;
