// scripts/watch-events.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kldavlcvwrmkqbifplxh.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // exportar en terminal
const TICKET_ID = process.env.TICKET_ID || 'e04c0142-8b88-4be0-adba-cf04efa4a5d7';

if (!SERVICE_ROLE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
  auth: { persistSession: false },
});

console.log('Conectando a Realtime para ticket_id =', TICKET_ID);

const channel = supabase
  .channel('ticket-events')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'ticket_events', filter: `ticket_id=eq.${TICKET_ID}` },
    (payload) => {
      console.log('EVENTO ▶', JSON.stringify(payload, null, 2));
    }
  )
  .subscribe((status) => console.log('Realtime status:', status));

process.on('SIGINT', async () => {
  console.log('\nCerrando suscripción…');
  await supabase.removeChannel(channel);
  process.exit(0);
});
