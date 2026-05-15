alter table public.books
add column if not exists toc text;

notify pgrst, 'reload schema';
