-- Unique credential identity + faster login lookup.
-- Better Auth matches providerId='credential' + accountId=user.id.
-- Drop exact duplicate rows first so the unique index can apply on existing DBs.
delete from "account" a
where exists (
  select 1 from "account" b
  where b."providerId" = a."providerId"
    and b."accountId" = a."accountId"
    and b.id > a.id
);

create unique index if not exists account_provider_account_uidx
  on "account" ("providerId", "accountId");
