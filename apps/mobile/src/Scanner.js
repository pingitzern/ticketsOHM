import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, ActivityIndicator, Modal, TextInput, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function Scanner({ supabase, onBack, onDone }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);      // candado antirepetición
  const [lastScan, setLastScan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formComment, setFormComment] = useState('');
  const [saving, setSaving] = useState(false);
  const cooldownRef = useRef(null);
  const scannedDataRef = useRef(null);                      // QR crudo

  useEffect(() => {
    if (!permission) requestPermission();
    return () => { if (cooldownRef.current) clearTimeout(cooldownRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  if (!permission) return <Text>Solicitando permisos…</Text>;
  if (!permission.granted) return <Text>Sin permiso de cámara.</Text>;

  const onScan = ({ data, type }) => {
    if (isScanning || showForm) return;
    setIsScanning(true);
    scannedDataRef.current = data;

    const ts = new Date().toLocaleString();
    setFormTitle(`QR ${ts}`);
    setFormComment('');
    setShowForm(true);
  };

  const createTicket = async () => {
    if (!scannedDataRef.current) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Login requerido'); return; }

      const { data: profile, error: eProf } = await supabase
        .from('profiles').select('tenant_id').eq('id', user.id).single();
      if (eProf || !profile) { alert('Sin perfil/tenant. Ejecutá el seed en la web.'); return; }

      const desc = `Creado desde mobile.\nQR=${scannedDataRef.current}\nComentario: ${formComment || '(sin comentario)'}`;

      const { error } = await supabase.from('tickets').insert({
        tenant_id: profile.tenant_id,
        title: formTitle || `QR ${new Date().toLocaleString()}`,
        description: desc,
        status: 'open',
        created_by: user.id
      });

      if (error) alert(error.message);
      else {
        setLastScan(scannedDataRef.current);
        setShowForm(false);
        alert('Ticket creado!');
        onDone && onDone();
      }
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
      cooldownRef.current = setTimeout(() => setIsScanning(false), 800);
      scannedDataRef.current = null;
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    scannedDataRef.current = null;
    cooldownRef.current = setTimeout(() => setIsScanning(false), 500);
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        // Sólo QR para mejor performance; podés agregar más tipos si querés
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScan}
      />
      <View style={{ padding: 12, gap: 8 }}>
        {isScanning ? <ActivityIndicator /> : null}
        <Button title="Volver" onPress={onBack} />
        {lastScan && <Text>Último QR: {lastScan}</Text>}
      </View>

      {/* Formulario previo a crear ticket */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Nuevo ticket</Text>
            <Text style={{ opacity: 0.7, marginBottom: 8 }}>QR: {scannedDataRef.current}</Text>

            <Text style={{ marginBottom: 4 }}>Título</Text>
            <TextInput
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="Título del ticket"
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 }}
            />

            <Text style={{ marginBottom: 4 }}>Comentario</Text>
            <TextInput
              value={formComment}
              onChangeText={setFormComment}
              placeholder="Comentario / diagnóstico rápido"
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 70, textAlignVertical: 'top' }}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                onPress={cancelForm}
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center' }}
                disabled={saving}
              >
                <Text>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createTicket}
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#111', alignItems: 'center' }}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Crear ticket</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
