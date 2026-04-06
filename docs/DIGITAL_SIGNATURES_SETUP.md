# 🔐 Configuración de Firmas Digitales con HelloSign

Esta guía te muestra cómo configurar HelloSign (Dropbox Sign) para agregar firmas digitales legalmente vinculantes a los recibos de MyRent.

---

## 📋 Requisitos Previos

- ✅ Cuenta de HelloSign (Dropbox Sign)
- ✅ API Key de HelloSign
- ✅ URL pública de tu app (para webhooks)

---

## 🚀 Paso 1: Crear Cuenta en HelloSign

1. Ve a [hellosign.com](https://www.hellosign.com/)
2. Click en **"Get Started"** o **"Sign Up"**
3. Elige el plan:
   - **Free Trial**: Gratis por 30 días (3 documentos/mes)
   - **Essentials**: ~$15/mes (documentos ilimitados)
   - **Standard**: ~$25/mes (+ API features)

   **Recomendado para MyRent:** Plan **Essentials** ($15/mes)

4. Completa el registro con tu email

---

## 🔑 Paso 2: Obtener API Key

1. Inicia sesión en HelloSign
2. Ve a **Settings** (Configuración)
3. Click en **API** en el menú lateral
4. Habilita **API Access** si está deshabilitado
5. Copia tu **API Key** (empieza con algo como `abc123...`)
6. Copia tu **Client ID** (opcional pero recomendado)

---

## 🌐 Paso 3: Configurar Webhook

HelloSign enviará eventos a tu app cuando alguien firme.

### **a) URL del Webhook**

Tu webhook estará en:
```
https://TU-DOMINIO.com/api/webhooks/hellosign
```

**Ejemplo con Vercel:**
```
https://my-rent-app.vercel.app/api/webhooks/hellosign
```

### **b) Configurar en HelloSign**

1. En HelloSign Dashboard → **Settings** → **API**
2. Busca la sección **"Callbacks"** o **"Webhooks"**
3. Agrega tu URL del webhook
4. Eventos a suscribirse:
   - ✅ `signature_request_sent`
   - ✅ `signature_request_viewed`
   - ✅ `signature_request_signed`
   - ✅ `signature_request_all_signed`
   - ✅ `signature_request_declined`

5. Click **Save**

---

## 🔐 Paso 4: Agregar Variables de Entorno

Agrega estas variables a tu `.env.local`:

```bash
# HelloSign (Dropbox Sign)
HELLOSIGN_API_KEY=tu_api_key_aqui
HELLOSIGN_CLIENT_ID=tu_client_id_aqui  # Opcional
```

**Ejemplo:**
```bash
HELLOSIGN_API_KEY=abc123def456ghi789
HELLOSIGN_CLIENT_ID=client_xyz789
```

---

## 🗄️ Paso 5: Aplicar Migración de Base de Datos

Ejecuta la migración para agregar los campos de firma:

### **Opción 1: Supabase Dashboard**

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. **SQL Editor** → **New query**
3. Copia el contenido de: `supabase/migrations/20260212_add_digital_signatures.sql`
4. Click **Run**

### **Opción 2: Supabase CLI**

```bash
supabase db push
```

---

## 📦 Paso 6: Instalar Dependencias (si es necesario)

Las dependencias ya están incluidas en Node.js, pero verifica que tengas:

```bash
pnpm install
```

---

## 🧪 Paso 7: Probar en Modo Test

HelloSign tiene un **Test Mode** para probar sin consumir documentos reales.

### **Activar Test Mode**

En `lib/signatures/hellosign-client.ts`, la línea:

```typescript
formData.append('test_mode', process.env.NODE_ENV !== 'production' ? '1' : '0')
```

Ya activa test mode automáticamente en desarrollo.

### **Crear un Recibo de Prueba**

1. Inicia tu app: `pnpm dev`
2. Crea un recibo en **Receipts** → **New Receipt**
3. En la página del recibo, click **"Enviar para Firma"**
4. El sistema creará la solicitud en HelloSign (test mode)
5. Recibirás un email con el link para firmar
6. Firma como propietario
7. El sistema enviará automáticamente al inquilino
8. El inquilino firma
9. Ambos reciben el PDF final firmado

### **Verificar Webhooks**

Los webhooks llegarán a: `http://localhost:3000/api/webhooks/hellosign`

Para probar webhooks en desarrollo local, usa **ngrok**:

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer localhost:3000
ngrok http 3000

# Usa la URL de ngrok en HelloSign webhook settings:
# https://abc123.ngrok.io/api/webhooks/hellosign
```

---

## 🚀 Paso 8: Desplegar a Producción

1. **Deploy a Vercel/Railway/etc:**
   ```bash
   vercel --prod
   ```

2. **Agregar variables de entorno en producción:**
   - Ve a tu plataforma de hosting
   - Agrega `HELLOSIGN_API_KEY` y `HELLOSIGN_CLIENT_ID`

3. **Actualizar Webhook URL en HelloSign:**
   - Cambia de ngrok URL a tu URL de producción
   - Ejemplo: `https://myrent.vercel.app/api/webhooks/hellosign`

4. **Desactivar Test Mode:**
   - En producción, `NODE_ENV=production` automáticamente desactiva test mode
   - Los documentos ahora son reales y legalmente vinculantes

---

## 📊 Flujo Completo

```
1. Propietario crea recibo → PDF generado
   ↓
2. Propietario click "Enviar para Firma"
   ↓
3. Sistema envía PDF a HelloSign
   ↓
4. HelloSign envía email al propietario con link
   ↓
5. Propietario abre email y firma
   ↓
6. HelloSign webhook → MyRent actualiza estado: "landlord_signed"
   ↓
7. HelloSign envía email al inquilino automáticamente
   ↓
8. Inquilino abre email y firma
   ↓
9. HelloSign webhook → MyRent actualiza estado: "fully_signed"
   ↓
10. Sistema descarga PDF firmado y lo guarda en Supabase Storage
    ↓
11. Ambos reciben email con PDF final firmado
```

---

## 🔍 Verificar que Funciona

### **En la Interfaz:**

1. Ve a **Receipts**
2. Abre un recibo
3. Deberías ver la sección **"Estado de Firma Digital"**
4. Si está pendiente: botón **"Enviar para Firma"**
5. Si ya se envió: timeline mostrando quién firmó y cuándo

### **En la Base de Datos:**

```sql
-- Ver recibos con firma
SELECT
  id,
  period,
  signature_status,
  landlord_signed_at,
  tenant_signed_at
FROM receipts
WHERE signature_request_id IS NOT NULL;

-- Ver eventos de firma
SELECT * FROM signature_events ORDER BY created_at DESC;
```

### **En HelloSign Dashboard:**

1. Ve a **Documents**
2. Deberías ver tus solicitudes de firma
3. Estado de cada documento
4. Quién firmó y cuándo

---

## 💰 Costos Estimados

| Plan | Precio/mes | Documentos | API Access |
|------|-----------|------------|------------|
| Free Trial | $0 | 3/mes | ✅ |
| Essentials | ~$15 | Ilimitados | ✅ |
| Standard | ~$25 | Ilimitados + Templates | ✅ |

**Para MyRent:** Empieza con **Free Trial** para probar, luego **Essentials** ($15/mes) es suficiente.

---

## 🆘 Troubleshooting

### **Error: "HELLOSIGN_API_KEY is not defined"**
- Verifica que agregaste la variable en `.env.local`
- Reinicia el servidor: `Ctrl+C` y `pnpm dev`

### **Webhook no llega**
- Verifica la URL en HelloSign Dashboard
- Si es localhost, usa ngrok
- Revisa logs en Vercel/Railway

### **Firmas no se actualizan en la app**
- Revisa que el webhook esté configurado
- Checa logs del webhook: `lib/utils/logger.ts`
- Verifica que la migración de DB se aplicó

### **Test mode no funciona**
- Asegúrate que `NODE_ENV !== 'production'`
- En `.env.local` NO pongas `NODE_ENV=production`

---

## 📚 Recursos

- [HelloSign API Docs](https://developers.hellosign.com/)
- [Webhooks Guide](https://developers.hellosign.com/api/reference/Webhooks/)
- [Test Mode](https://developers.hellosign.com/api/reference/TestMode/)

---

## ✅ Checklist de Configuración

- [ ] Cuenta de HelloSign creada
- [ ] API Key obtenida
- [ ] Client ID obtenido (opcional)
- [ ] Webhook URL configurada en HelloSign
- [ ] Variables de entorno agregadas a `.env.local`
- [ ] Migración de DB aplicada
- [ ] Servidor reiniciado
- [ ] Recibo de prueba creado y enviado para firma
- [ ] Webhook recibido y procesado
- [ ] PDF firmado descargado correctamente

Una vez completado, ¡tendrás firmas digitales legalmente vinculantes en MyRent! 🎉
