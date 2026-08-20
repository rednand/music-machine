alter table tracks add constraint tracks_album_track_number_key unique (album_id, track_number);
alter table credits add constraint credits_album_person_role_key unique (album_id, person_name, role);
