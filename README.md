# Ticketing Monorepo (Next.js + Expo + Supabase)

Monorepo minimal listo para desplegar **hoy**:
- **Web**: Next.js (App Router) con login Supabase, `/tickets`, `/scan`, `/admin/seed`
- **Mobile**: Expo (React Native) con login, **QR scanner** y alta rápida de ticket
- **DB**: Supabase (Postgres + RLS)
- **RLS**: basada en `profiles.tenant_id` sin claims personalizados en JWT

## Requisitos
- Node 18+
- PNPM (`npm i -g pnpm`) o NPM
- Cuenta en Supabase
- Expo Go en tu teléfono

## Pasos rápidos
1. Crear proyecto Supabase → copiar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Ir a **SQL Editor** → pegar **`packages/db/schema.sql`** y ejecutar.
3. En `apps/web` crear `.env.local` desde `.env.example` (completa URL y keys). Añade `SUPABASE_SERVICE_ROLE_KEY` solo en servidores (Vercel).
4. En `apps/mobile` crear `.env` desde `.env.example`.
5. Local:
    ```bash
    pnpm install
    pnpm --filter web dev
    pnpm --filter mobile dev
    ```
6. Deploy Web (Vercel):
   - Raíz del proyecto: `apps/web`
   - Variables de entorno: ver `.env.example`
7. **Seed rápido**:
   - Autenticado en la web, abrí `https://<tu-web>/admin/seed` y presioná **Crear tenant demo**.
   - Crea `tenant`, `profile`, un `asset` y un `ticket` de prueba asociados a tu usuario.
8. Mobile (Expo Go):
   ```bash
   cd apps/mobile
   pnpm dev
   ```
   Escaneá el QR con **Expo Go**, logueate y probá el **Scan**.

## Notas
- El scanner web usa `@zxing/browser` si hay cámara.
- El scanner mobile usa `expo-barcode-scanner`.
- Las inserciones respetan RLS porque se comparan contra `profiles.tenant_id` del `auth.uid()` actual.
- Para producción, activá verificación de correo y dominios de redirect en Supabase Auth.

— Generado el 2025-08-09
