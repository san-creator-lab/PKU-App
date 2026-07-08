-- Hero Fuel — gamification 2.0: coin economy, game tokens and avatar gear.
--
-- coins:        spendable currency earned via daily missions, green days,
--               streak milestones and the Fuel Rush mini-game
-- game_tokens:  plays for the arcade; logging fuel grants tokens (max 5)
-- gear:         jsonb bag: { owned: text[], equipped: {slot: item},
--               daily: {date, claimed[], chestOpened, gamesPlayed},
--               stats: {coinsEarned, allDailiesCount, hiscore} }
--
-- All three live on profiles, so the existing family-scoped RLS policies
-- and realtime publication cover them unchanged.

alter table public.profiles
  add column coins int not null default 0 check (coins >= 0),
  add column game_tokens int not null default 3
    check (game_tokens >= 0 and game_tokens <= 9),
  add column gear jsonb not null default '{}'::jsonb;
