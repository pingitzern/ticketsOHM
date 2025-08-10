import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function usePushRegistration(supabase) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = null;
    let disposed = false;

    async function registerIfLogged() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { return; } // aún sin sesión, esperamos al listener

        // permisos
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') { return; }

        // projectId desde app.json (eas init ya lo puso)
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ||
          Constants?.easConfig?.projectId || null;

        const token = projectId
          ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
          : (await Notifications.getExpoPushTokenAsync()).data;

        if (!token) return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        // tenant
        const { data: profile, error: eProf } = await supabase
          .from('profiles').select('tenant_id').eq('id', user.id).single();
        if (eProf || !profile) return;

        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          tenant_id: profile.tenant_id,
          expo_token: token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,expo_token' });

        console.log('Push token registrado:', token);
      } catch (e) {
        console.warn('No se pudo registrar token', e);
      } finally {
        if (!disposed) setReady(true);
      }
    }

    // 1) Intento inmediato (por si ya hay sesión cacheada)
    registerIfLogged();

    // 2) Re-intentar cuando cambie la sesión (login/logout)
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) registerIfLogged();
    });
    unsub = sub?.data?.subscription;

    return () => {
      disposed = true;
      if (unsub) unsub.unsubscribe();
    };
  }, [supabase]);

  return ready;
}
