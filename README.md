# WOOILFARM FieldLog

A responsive tomato-farm attendance and daily-work app with two separate pages:

- `index.html` — farmer check-in, check-out, and time-based work-department logging
- `admin.html` — live dashboard, attendance table, work board, farmer directory, and Excel export

Workers can add themselves from the check-in page using **“New at WOOILFARM? Add your name”**. Their name, department, and role are saved and they can check in immediately.

The project is purposely separated into HTML, CSS, JavaScript, and backend files. It runs in a helpful local demo mode out of the box, so you can test the full user flow without a database.

## Connect Supabase

1. Create a Supabase project.
2. Open its SQL Editor and run all of `supabase-schema.sql`.
3. In `supabase.js`, paste the project URL and publishable/anon key into `WOOILFARM_CONFIG`.
4. Host the files with any static web host (Netlify, Vercel, Supabase hosting, etc.).

Once those values are present, the UI automatically reads and writes employees, check-ins, check-outs, and work logs to Supabase instead of browser demo data.

## Excel attendance report

In **Farm Desk → Attendance**, use **Export Excel**. The downloaded `.xls` opens in Microsoft Excel and includes farmer, team, date, check-in, check-out, hours, and status.

## Security before launch

The included SQL has simple starter row-level-security policies so the prototype can work. Before launching publicly, replace them with Supabase Auth-based policies for farmers and admins. Never add a Supabase service-role key to `supabase.js`.
