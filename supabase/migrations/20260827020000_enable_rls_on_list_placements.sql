alter table list_placements enable row level security;
create policy list_placements_public_read on list_placements for select using (true);
