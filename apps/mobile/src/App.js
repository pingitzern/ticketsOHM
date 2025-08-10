import React, { useState } from 'react';
import { View, Text, Button, TextInput } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import Scanner from './Scanner';
import Tickets from './Tickets';
import TicketDetail from './TicketDetail';
import usePushRegistration from './usePushRegistration';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screen, setScreen] = useState('login');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const ready = usePushRegistration(supabase); // registra token apenas hay sesión

  const login = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else setScreen('tickets');
  };

  const openDetail = (id) => {
    setSelectedTicketId(id);
    setScreen('ticketDetail');
  };

  return (
    <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: 'center' }}>
      {screen === 'login' && (
        <>
          <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Login</Text>
          <TextInput
            placeholder="Email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={{ borderWidth: 1, padding: 8 }}
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={{ borderWidth: 1, padding: 8 }}
          />
          <Button title="Entrar" onPress={login} />
        </>
      )}

      {screen === 'scanner' && (
        <Scanner
          supabase={supabase}
          onBack={() => setScreen('tickets')}
          onDone={() => setScreen('tickets')}
        />
      )}

      {screen === 'tickets' && (
        <Tickets
          supabase={supabase}
          onBack={() => setScreen('login')}
          onScan={() => setScreen('scanner')}
          onOpen={openDetail}
        />
      )}

      {screen === 'ticketDetail' && selectedTicketId && (
        <TicketDetail
          supabase={supabase}
          ticketId={selectedTicketId}
          onBack={() => setScreen('tickets')}
        />
      )}
    </View>
  );
}
