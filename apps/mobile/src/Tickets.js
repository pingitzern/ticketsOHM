import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Button, FlatList, RefreshControl, TouchableOpacity, Alert, TextInput } from 'react-native';

const STATUS_LABEL = {
  open: 'open',
  in_progress: 'in progress',
  closed: 'closed',
};

function StatusPill({ status }) {
  const bg =
    status === 'open' ? '#E0F2FE' :
    status === 'in_progress' ? '#FEF9C3' :
    '#E5E7EB';
  const color =
    status === 'open' ? '#0369A1' :
    status === 'in_progress' ? '#854D0E' :
    '#374151';
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ color, fontSize:12 }}>{STATUS_LABEL[status] || status}</Text>
    </View>
  );
}

export default function Tickets({ supabase, onBack, onScan, onOpen }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tenantId, setTenantId] = useState(null);

  // filtros
  const [tab, setTab] = useState('all'); // all | open | in_progress | closed
  const [query, setQuery] = useState('');
  const qRef = useRef('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Login requerido'); return; }

      // tenant
      let tId = tenantId;
      if (!tId) {
        const { data: profile, error: eProf } = await supabase
          .from('profiles').select('tenant_id').eq('id', user.id).single();
        if (eProf || !profile) { Alert.alert('Sin perfil/tenant. Ejecutá el seed en la web.'); return; }
        tId = profile.tenant_id;
        setTenantId(tId);
      }

      // base query
      let q = supabase
        .from('tickets')
        .select('id,title,description,status,created_at,priority')
        .eq('tenant_id', tId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (tab !== 'all') q = q.eq('status', tab);

      const qText = qRef.current.trim();
      if (qText) {
        // buscar en título o descripción
        q = q.or(`title.ilike.%${qText}%,description.ilike.%${qText}%`);
      }

      const { data, error } = await q;
      if (error) Alert.alert('Error', error.message);
      else setItems(data || []);
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, tab, tenantId]);

  useEffect(() => { load(); }, [load]);

  // realtime por tenant
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase.channel('tickets-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `tenant_id=eq.${tenantId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, tenantId, load]);

  // debounce simple para la búsqueda
  useEffect(() => {
    const t = setTimeout(() => { qRef.current = query; load(); }, 300);
    return () => clearTimeout(t);
  }, [query, load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const closeTicket = async (id) => {
    try {
      const { error } = await supabase.from('tickets').update({ status: 'closed' }).eq('id', id);
      if (error) throw error;
      await load();
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => onOpen && onOpen(item.id)}
      style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee', gap:6 }}
    >
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text style={{ fontWeight: 'bold', flex:1, paddingRight:8 }} numberOfLines={1}>{item.title}</Text>
        <StatusPill status={item.status} />
      </View>
      <Text style={{ opacity:0.7 }} numberOfLines={1}>
        {new Date(item.created_at).toLocaleString()} · prio: {item.priority || '—'}
      </Text>
      {item.status !== 'closed' && (
        <View style={{ alignItems:'flex-end' }}>
          <Button title="Cerrar" onPress={() => closeTicket(item.id)} />
        </View>
      )}
    </TouchableOpacity>
  );

  const TabBtn = ({ value, label }) => (
    <TouchableOpacity
      onPress={() => setTab(value)}
      style={{
        paddingHorizontal:12, paddingVertical:8, borderRadius:999,
        backgroundColor: tab===value ? '#111' : '#eee'
      }}
    >
      <Text style={{ color: tab===value ? '#fff' : '#111' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* barra superior */}
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Button title="Volver" onPress={onBack} />
          <Button title="Scan QR" onPress={onScan} />
          <Button title="Refrescar" onPress={load} />
        </View>

        {/* filtros */}
        <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
          <TabBtn value="all" label="Todos" />
          <TabBtn value="open" label="Abiertos" />
          <TabBtn value="in_progress" label="En curso" />
          <TabBtn value="closed" label="Cerrados" />
        </View>

        {/* búsqueda */}
        <TextInput
          placeholder="Buscar por título o descripción…"
          value={query}
          onChangeText={setQuery}
          style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10 }}
        />
      </View>

      {/* lista */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            {loading ? 'Cargando…' : 'No hay tickets.'}
          </Text>
        }
      />
    </View>
  );
}
