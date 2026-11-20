-- Run the safety check-in job every 5 minutes.
-- Do this AFTER the app is deployed. Replace the two placeholders first:
--   YOUR-APP-URL   e.g. https://switchback.vercel.app
--   YOUR-CRON-SECRET  the same value as CRON_SECRET in Vercel
-- (Supabase dashboard → Database → Extensions: enable pg_cron and pg_net first.)

select cron.schedule(
  'switchback-check-ins',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-APP-URL/api/check-ins',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR-CRON-SECRET')
  );
  $$
);

-- To stop it later:  select cron.unschedule('switchback-check-ins');
