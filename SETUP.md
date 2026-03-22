# NEXUS — Guia Completo de Setup
## Next.js 14 + Supabase + Google Calendar + Vercel

---

## Estrutura do Projeto

```
nexus/
├── src/
│   ├── app/
│   │   ├── layout.tsx               ← Layout raiz
│   │   ├── page.tsx                 ← Redirect → /dashboard
│   │   ├── globals.css
│   │   ├── login/
│   │   │   └── page.tsx             ← Tela de login (Google OAuth)
│   │   ├── auth/
│   │   │   └── callback/route.ts    ← Callback OAuth
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           ← Layout com Sidebar (SSR auth guard)
│   │   │   ├── page.tsx             ← Dashboard (Server Component)
│   │   │   ├── tasks/page.tsx       ← Kanban de tarefas
│   │   │   ├── agenda/page.tsx      ← Calendário + GCal sync
│   │   │   ├── habitos/page.tsx     ← Tracker de hábitos
│   │   │   ├── academia/page.tsx    ← Treinos
│   │   │   ├── projetos/page.tsx    ← Projetos
│   │   │   ├── notas/page.tsx       ← Notas
│   │   │   ├── foco/page.tsx        ← Pomodoro
│   │   │   └── saude/page.tsx       ← Saúde
│   │   └── api/
│   │       ├── calendar/
│   │       │   ├── sync/route.ts    ← POST: importa GCal → Supabase
│   │       │   └── events/route.ts  ← GET/POST eventos
│   │       └── tasks/
│   │           ├── route.ts         ← GET/POST
│   │           └── [id]/route.ts    ← PATCH/DELETE
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   └── DashboardClient.tsx
│   ├── hooks/
│   │   ├── useTasks.ts              ← CRUD + Realtime
│   │   ├── useEvents.ts             ← CRUD + GCal sync
│   │   ├── useHabits.ts             ← Toggle + streak
│   │   └── useHealth.ts             ← Água, sono, foco
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            ← Browser client
│   │   │   └── server.ts            ← Server client (SSR)
│   │   └── google-calendar.ts       ← Google Calendar API
│   ├── middleware.ts                 ← Auth guard global
│   └── types/
│       └── database.ts              ← Tipos TypeScript do schema
├── supabase/
│   └── migrations/
│       └── 001_schema.sql           ← Schema completo + RLS + triggers
├── .env.local.example
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## PASSO 1 — Criar o projeto localmente

```bash
# Clone ou crie a pasta com os arquivos entregues
cd nexus
npm install
```

---

## PASSO 2 — Configurar o Supabase

### 2.1 Criar projeto
1. Acesse https://supabase.com/dashboard
2. Clique em **New project**
3. Dê um nome (ex: `nexus-prod`) e escolha a região mais próxima (South America - São Paulo)
4. Anote a senha do banco — você vai precisar depois

### 2.2 Rodar o schema SQL
1. No dashboard do Supabase: **SQL Editor → New query**
2. Cole o conteúdo inteiro de `supabase/migrations/001_schema.sql`
3. Clique em **Run** — isso cria todas as tabelas, RLS e triggers

### 2.3 Pegar as chaves da API
No Supabase: **Settings → API**
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca expor no frontend)

### 2.4 Configurar Auth Google no Supabase
1. Supabase → **Authentication → Providers → Google**
2. Habilite o provider
3. Coloque o `Client ID` e `Client Secret` do Google (veja Passo 3)
4. **Authorized redirect URIs** → copie o valor mostrado pelo Supabase
   - Geralmente: `https://SEU_PROJECT_ID.supabase.co/auth/v1/callback`

---

## PASSO 3 — Configurar Google Cloud (Calendar API)

### 3.1 Criar projeto no Google Cloud
1. Acesse https://console.cloud.google.com
2. **New Project** → nome: `nexus-app`
3. Selecione o projeto criado

### 3.2 Habilitar Google Calendar API
1. **APIs & Services → Enable APIs and Services**
2. Busque `Google Calendar API` → **Enable**

### 3.3 Criar credenciais OAuth 2.0
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. **Authorized redirect URIs** — adicione:
   - `http://localhost:3000/auth/callback` (desenvolvimento)
   - `https://SEU_DOMINIO.vercel.app/auth/callback` (produção)
   - A URI do Supabase do passo 2.4
4. Copie o **Client ID** e **Client Secret**

### 3.4 Configurar OAuth Consent Screen
1. **APIs & Services → OAuth consent screen**
2. User Type: **External**
3. Preencha nome do app, email de suporte
4. **Scopes**: adicione `calendar`, `calendar.events`, `openid`, `email`, `profile`
5. Em **Test users**: adicione seu email para testar (antes de publicar o app)

---

## PASSO 4 — Variáveis de ambiente

Copie o arquivo `.env.local.example` para `.env.local` e preencha:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR...

GOOGLE_CLIENT_ID=000000000000-xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gere_com: openssl rand -base64 32
```

---

## PASSO 5 — Rodar localmente

```bash
npm run dev
# Acesse http://localhost:3000
# Você será redirecionado para /login
# Clique em "Entrar com Google"
```

---

## PASSO 6 — Deploy no Vercel

### 6.1 Subir para o GitHub
```bash
git init
git add .
git commit -m "feat: NEXUS v1.0"
git remote add origin https://github.com/SEU_USER/nexus.git
git push -u origin main
```

### 6.2 Importar no Vercel
1. Acesse https://vercel.com/new
2. Importe o repositório do GitHub
3. Framework: **Next.js** (auto-detectado)

### 6.3 Adicionar variáveis de ambiente no Vercel
Em **Settings → Environment Variables**, adicione todas as variáveis do `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_URL` → URL do seu app no Vercel (ex: `https://nexus.vercel.app`)
- `NEXTAUTH_SECRET`

### 6.4 Atualizar redirect URIs
Após ter a URL do Vercel:
1. **Google Cloud Console → Credentials** → edite o OAuth client
   - Adicione `https://nexus.vercel.app/auth/callback`
2. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://nexus.vercel.app`
   - Redirect URLs: adicione `https://nexus.vercel.app/**`

### 6.5 Deploy
```bash
git push origin main
# Vercel faz deploy automático
```

---

## PASSO 7 — Salvar tokens Google no perfil

Após o login com Google, o Supabase retorna os tokens de acesso. Para sincronizar o Calendar, você precisa salvar o `access_token` e `refresh_token` no perfil do usuário.

Adicione isso na página de callback ou em um hook de inicialização:

```typescript
// src/app/auth/callback/route.ts — após exchangeCodeForSession
const { data: { session } } = await supabase.auth.getSession()
if (session?.provider_token) {
  await supabase.from('profiles').upsert({
    id: session.user.id,
    google_access_token:  session.provider_token,
    google_refresh_token: session.provider_refresh_token,
    google_token_expiry:  new Date(Date.now() + 3600 * 1000).toISOString(),
  })
}
```

---

## Fluxo de Sincronização Google Calendar

```
Login Google (OAuth)
        ↓
Supabase salva access_token + refresh_token no profile
        ↓
/dashboard/agenda → useEvents() → syncWithGoogle()
        ↓
POST /api/calendar/sync
        ↓
Busca eventos via Google Calendar API
        ↓
Upsert no Supabase (tabela events, onConflict: gcal_event_id)
        ↓
Realtime: todos os clientes recebem os novos eventos
        ↓
Criar evento local → POST /api/calendar/events
        ↓
Salva no Supabase + cria no Google Calendar API
        ↓
Evento aparece no Google Calendar do usuário ✓
```

---

## Tabelas do Banco (Supabase)

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Estende auth.users, salva tokens Google |
| `tasks` | Tarefas com status kanban |
| `events` | Eventos + link com gcal_event_id |
| `habits` | Definição dos hábitos |
| `habit_logs` | Registro diário (um por hábito/dia) |
| `exercises` | Exercícios por dia da semana |
| `workout_sets` | Séries completadas por sessão |
| `personal_records` | PRs por exercício |
| `projects` | Projetos com progresso |
| `notes` | Notas com tag e busca |
| `health_logs` | Água, sono, passos, humor, check-in |
| `focus_sessions` | Sessões pomodoro |

Todas com **Row Level Security** — cada usuário só acessa seus próprios dados.

---

## Próximos passos sugeridos

- [ ] Adicionar páginas de tarefas, hábitos, academia (seguindo o padrão do `agenda/page.tsx`)
- [ ] Supabase Realtime já está configurado nos hooks — os dados atualizam em tempo real
- [ ] Adicionar notificações push com Supabase Edge Functions
- [ ] Adicionar Supabase Storage para foto de perfil
- [ ] Configurar refresh automático do token Google com um cron job no Vercel

---

## Stack usada

- **Next.js 14** — App Router, Server Components, Route Handlers
- **Supabase** — Banco PostgreSQL, Auth, Realtime, Row Level Security
- **Google Calendar API** — Leitura + criação + edição de eventos
- **Vercel** — Deploy, Edge Functions, CI/CD automático
- **TypeScript** — Tipos completos do schema
- **date-fns** — Manipulação de datas
