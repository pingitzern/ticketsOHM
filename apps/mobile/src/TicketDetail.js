import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, ActivityIndicator, TextInput, Alert } from 'react-native';

export default function TicketDetail({ supabase, ticketId, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('medium');
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id,title,description,status,priority,created_at')
        .eq('id', ticketId)
        .single();
      if (error) throw error;
      setTicket(data);
      setStatus(data?.status || 'open');
      setPriority(data?.priority || 'medium');
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [supabase, ticketId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      // anexamos comentario al final de la descripción para mantenerlo simple
      let newDescription = ticket.description || '';
      if (comment.trim()) {
        const stamp = new Date().toLocaleString();
        newDescription += `${newDescription ? '\n\n' : ''}[Mobile ${stamp}] ${comment.trim()}`;
      }

      const { error } = await supabase
        .from('tickets')
        .update({ status, priority, description: newDescription })
        .eq('id', ticket.id);

      if (error) throw error;
      Alert.alert('OK', 'Cambios guardados');
      setComment('');
      await load();
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={{ flex:1, padding:16, justifyContent:'center', alignItems:'center' }}>
      <ActivityIndicator />
      <Text style={{ marginTop:8 }}>Cargando ticket…</Text>
    </View>
  );

  if (!ticket) return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Button title="Volver" onPress={onBack} />
      <Text>No se encontró el ticket.</Text>
    </View>
  );

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Button title="Volver" onPress={onBack} />
        <Text style={{ fontSize:18, fontWeight:'bold' }}>Ticket</Text>
        <View style={{ width:80 }} />
      </View>

      <Text style={{ fontSize:20, fontWeight:'bold' }}>{ticket.title}</Text>
      <Text style={{ opacity:0.7 }}>Creado: {new Date(ticket.created_at).toLocaleString()}</Text>

      {/* Estado */}
      <View style={{ flexDirection:'row', gap:8, alignItems:'center', marginTop:8 }}>
        <Text style={{ width:90 }}>Estado</Text>
        {['open','in_progress','closed'].map(s => (
          <Button
            key={s}
            title={s.replace('_',' ')}
            color={status===s ? undefined : '#999'}
            onPress={() => setStatus(s)}
          />
        ))}
      </View>

      {/* Prioridad */}
      <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
        <Text style={{ width:90 }}>Prioridad</Text>
        {['low','medium','high'].map(p => (
          <Button
            key={p}
            title={p}
            color={priority===p ? undefined : '#999'}
            onPress={() => setPriority(p)}
          />
        ))}
      </View>

      {/* Descripción existente */}
      <View style={{ borderWidth:1, borderColor:'#eee', padding:10, borderRadius:8 }}>
        <Text style={{ fontWeight:'bold', marginBottom:6 }}>Descripción</Text>
        <Text style={{ lineHeight:20 }}>{ticket.description || '—'}</Text>
      </View>

      {/* Nuevo comentario */}
      <Text style={{ fontWeight:'bold' }}>Agregar comentario</Text>
      <TextInput
        placeholder="Escribí un comentario…"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, minHeight:70, textAlignVertical:'top' }}
      />

      <Button title={saving ? 'Guardando…' : 'Guardar cambios'} disabled={saving} onPress={save} />
    </View>
  );
}
