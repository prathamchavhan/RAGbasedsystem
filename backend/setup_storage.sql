-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create a new Storage Bucket named 'pdfs'
insert into storage.buckets (id, name, public) 
values ('pdfs', 'pdfs', false) 
on conflict (id) do nothing;

-- 2. Define RLS Policies for the 'pdfs' bucket

-- Give users permission to read their own files. 
-- The file path convention will be: project_id/filename
create policy "Users can read their own PDFs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'pdfs' 
  and
  auth.uid() = owner
);

-- Give users permission to upload their own files.
create policy "Users can upload their own PDFs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pdfs'
  and
  auth.uid() = owner
);

-- Give users permission to delete their own files.
create policy "Users can delete their own PDFs"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'pdfs'
  and
  auth.uid() = owner
);
