-- Artem's friends list for Circle, grouped by closeness.
-- Run in Supabase SQL Editor after schema.sql. Safe to run again:
-- a friend who already exists (same name, any case) just gets their tier
-- updated, nothing is duplicated, and no other details are touched.
--
-- If this project has more than one account, put the account's email in
-- target_email below. With a single account it's picked automatically.
do $$
declare
  target_email text := '';
  uid uuid;
  n int;
  tier record;
  nm text;
begin
  if target_email <> '' then
    select id into uid from auth.users where lower(email) = lower(target_email);
  else
    select count(*) into n from auth.users;
    if n <> 1 then
      raise exception 'Found % accounts: set target_email at the top of this script', n;
    end if;
    select id into uid from auth.users;
  end if;
  if uid is null then raise exception 'No account found for %', target_email; end if;

  for tier in
    select * from (values
      ('best', array[
        'Aicha', 'Ege', 'Ishi', 'Ivan', 'Lucca', 'Egor', 'Dan'
      ]),
      ('good', array[
        'Mitya', 'Felix', 'Adam', 'Daan', 'Sanjay', 'Dominik', 'Stefan', 'Aykhan', 'JP',
        'Joris', 'Aashita', 'Kirill', 'Maciek', 'Daniel', 'Charlie Australia', 'Sana', 'Dima',
        'Natveil', 'Islam', 'Gilles', 'Manu', 'Joaqo', 'Tomás', 'Darina', 'Sonya'
      ]),
      ('acquaintance', array[
        'Lina', 'Judah', 'Sarim', 'Sebbe', 'Sofia V', 'Emma', 'Paola', 'Charlotte', 'Polina',
        'Adelaide', 'Giorgia', 'Morte', 'MC', 'Rosi', 'Milena', 'Andrey', 'Mehdi', 'Vika',
        'Vika Bilevich', 'Tomasso', 'Caterina'
      ])
    ) as t(closeness, names)
  loop
    foreach nm in array tier.names loop
      update public.friends set closeness = tier.closeness
        where user_id = uid and lower(name) = lower(nm);
      if not found then
        insert into public.friends (user_id, name, closeness) values (uid, nm, tier.closeness);
      end if;
    end loop;
  end loop;
end $$;
