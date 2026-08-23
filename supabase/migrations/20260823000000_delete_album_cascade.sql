create or replace function delete_album_cascade(target_album_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from credits where album_id = target_album_id;
  delete from tracks where album_id = target_album_id;
  delete from performance_records where album_id = target_album_id;
  delete from reviews where album_id = target_album_id;
  delete from curiosities where album_id = target_album_id;
  delete from influences where from_album_id = target_album_id or to_album_id = target_album_id;
  delete from recommendations where subject_album_id = target_album_id or recommended_album_id = target_album_id;
  delete from narrative_articles where album_id = target_album_id; -- cascades to narrative_statements (+ sources)
  delete from albums where id = target_album_id;
end;
$$;
