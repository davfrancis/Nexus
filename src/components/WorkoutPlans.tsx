'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Exercise } from '@/types/database'

// ── Volume landmarks per muscle group (Israetel / Renaissance Periodization) ──
const VOL: Record<string, { mev: number; mavMin: number; mavMax: number; mrv: number }> = {
  peito:    { mev: 8,  mavMin: 12, mavMax: 20, mrv: 22 },
  costas:   { mev: 10, mavMin: 14, mavMax: 22, mrv: 25 },
  ombros:   { mev: 6,  mavMin: 16, mavMax: 22, mrv: 26 },
  bíceps:   { mev: 6,  mavMin: 14, mavMax: 20, mrv: 26 },
  tríceps:  { mev: 6,  mavMin: 14, mavMax: 20, mrv: 22 },
  pernas:   { mev: 8,  mavMin: 12, mavMax: 20, mrv: 24 },
  glúteos:  { mev: 4,  mavMin: 8,  mavMax: 16, mrv: 20 },
  abdômen:  { mev: 0,  mavMin: 10, mavMax: 16, mrv: 20 },
}

// ── Goal types ──────────────────────────────────────────────────────
type GoalKey = 'emagrecimento' | 'recomposicao' | 'ganho_massa' | 'bulking' | 'cutting' | 'manutencao'

const GOAL_LABEL: Record<GoalKey, string> = {
  emagrecimento: 'Emagrecimento', recomposicao: 'Recomposição', ganho_massa: 'Ganho de Massa',
  bulking: 'Bulking', cutting: 'Cutting', manutencao: 'Manutenção',
}

// ── Exercise template ───────────────────────────────────────────────
type ExTpl = { name: string; icon: string; muscle_group: string; day_of_week: number; sets: number; reps: number; weight_kg: number }

// ── 4 science-based programs ────────────────────────────────────────
const PROGRAMS: {
  id: string; name: string; subtitle: string; icon: string; color: string
  days: string; periodization: string; goals: GoalKey[]
  repRange: string; rest: string; level: string
  science: string
  exercises: ExTpl[]
}[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    subtitle: '6 dias — 2 hits/músculo/semana',
    icon: '🏋️',
    color: '#4d96ff',
    days: 'Dom Push · Seg Pull · Ter Legs · Qui Push · Sex Pull · Sáb Legs',
    periodization: 'DUP — combina força (4–6 reps) e hipertrofia (10–15 reps) na mesma semana',
    goals: ['bulking', 'ganho_massa'],
    repRange: '5–15 reps (varia por sessão)',
    rest: '2–3 min compostos · 60–90s isolados',
    level: 'Intermediário / Avançado',
    science: 'Schoenfeld et al. 2016: cada músculo 2x/semana maximiza síntese proteica. Krieger 2017: PPL + DUP produz ganhos superiores ao ABC em indivíduos treinados.',
    exercises: [
      // Dom 0 — Push A (Força)
      { name: 'Supino Reto com Barra',        icon: '🏋️', muscle_group: 'peito',   day_of_week: 0, sets: 4, reps: 6,  weight_kg: 0 },
      { name: 'Desenvolvimento com Halteres', icon: '💪', muscle_group: 'ombros',  day_of_week: 0, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Supino Inclinado Halteres',    icon: '🏋️', muscle_group: 'peito',   day_of_week: 0, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Tríceps Corda (Pulley)',        icon: '💪', muscle_group: 'tríceps', day_of_week: 0, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Elevação Lateral',              icon: '💪', muscle_group: 'ombros',  day_of_week: 0, sets: 4, reps: 15, weight_kg: 0 },
      // Seg 1 — Pull A (Força)
      { name: 'Levantamento Terra',           icon: '🏋️', muscle_group: 'costas',  day_of_week: 1, sets: 4, reps: 5,  weight_kg: 0 },
      { name: 'Remada Curvada com Barra',     icon: '🏋️', muscle_group: 'costas',  day_of_week: 1, sets: 4, reps: 8,  weight_kg: 0 },
      { name: 'Puxada Frontal (Lat Pulldown)',icon: '🏋️', muscle_group: 'costas',  day_of_week: 1, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Rosca Direta com Barra',       icon: '💪', muscle_group: 'bíceps',  day_of_week: 1, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Face Pull (Cabo)',              icon: '💪', muscle_group: 'ombros',  day_of_week: 1, sets: 3, reps: 15, weight_kg: 0 },
      // Ter 2 — Legs A (Volume)
      { name: 'Agachamento Livre',            icon: '🦵', muscle_group: 'pernas',  day_of_week: 2, sets: 4, reps: 6,  weight_kg: 0 },
      { name: 'Leg Press 45°',                icon: '🦵', muscle_group: 'pernas',  day_of_week: 2, sets: 4, reps: 12, weight_kg: 0 },
      { name: 'Stiff (Romeno) com Barra',     icon: '🦵', muscle_group: 'glúteos', day_of_week: 2, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Extensão de Perna (Máq.)',     icon: '🦵', muscle_group: 'pernas',  day_of_week: 2, sets: 3, reps: 15, weight_kg: 0 },
      { name: 'Flexão de Perna Deitado',      icon: '🦵', muscle_group: 'pernas',  day_of_week: 2, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Panturrilha em Pé',            icon: '🦵', muscle_group: 'pernas',  day_of_week: 2, sets: 4, reps: 15, weight_kg: 0 },
      // Qui 4 — Push B (Volume)
      { name: 'Supino Inclinado com Barra',   icon: '🏋️', muscle_group: 'peito',   day_of_week: 4, sets: 4, reps: 8,  weight_kg: 0 },
      { name: 'Desenvolvimento com Barra',    icon: '💪', muscle_group: 'ombros',  day_of_week: 4, sets: 4, reps: 8,  weight_kg: 0 },
      { name: 'Paralelas com Peso (Dips)',    icon: '💪', muscle_group: 'tríceps', day_of_week: 4, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Crucifixo com Halteres',       icon: '🏋️', muscle_group: 'peito',   day_of_week: 4, sets: 3, reps: 15, weight_kg: 0 },
      { name: 'Tríceps Testa (Skull Crusher)',icon: '💪', muscle_group: 'tríceps', day_of_week: 4, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Elevação Lateral no Cabo',     icon: '💪', muscle_group: 'ombros',  day_of_week: 4, sets: 4, reps: 15, weight_kg: 0 },
      // Sex 5 — Pull B (Volume)
      { name: 'Barra Fixa com Peso (Dominada)',icon:'🏋️', muscle_group: 'costas',  day_of_week: 5, sets: 4, reps: 8,  weight_kg: 0 },
      { name: 'Remada na Máquina (Cavalinho)', icon:'🏋️', muscle_group: 'costas',  day_of_week: 5, sets: 4, reps: 12, weight_kg: 0 },
      { name: 'Puxada Posterior (Supinado)',   icon:'🏋️', muscle_group: 'costas',  day_of_week: 5, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Rosca Martelo com Halteres',    icon:'💪', muscle_group: 'bíceps',  day_of_week: 5, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Rosca Concentrada Haltere',     icon:'💪', muscle_group: 'bíceps',  day_of_week: 5, sets: 3, reps: 12, weight_kg: 0 },
      // Sáb 6 — Legs B (Volume)
      { name: 'Agachamento Frontal',          icon: '🦵', muscle_group: 'pernas',  day_of_week: 6, sets: 4, reps: 8,  weight_kg: 0 },
      { name: 'Avanço com Halteres',          icon: '🦵', muscle_group: 'pernas',  day_of_week: 6, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Elevação de Quadril (Hip Thrust)',icon:'🦵',muscle_group: 'glúteos', day_of_week: 6, sets: 4, reps: 12, weight_kg: 0 },
      { name: 'Flexão de Perna Sentado',      icon: '🦵', muscle_group: 'pernas',  day_of_week: 6, sets: 3, reps: 15, weight_kg: 0 },
      { name: 'Panturrilha Sentado',          icon: '🦵', muscle_group: 'pernas',  day_of_week: 6, sets: 4, reps: 20, weight_kg: 0 },
    ],
  },
  {
    id: 'ul',
    name: 'Upper / Lower',
    subtitle: '4 dias — força + volume separados',
    icon: '💪',
    color: '#6bcb77',
    days: 'Seg Upper Força · Ter Lower Força · Qui Upper Volume · Sex Lower Volume',
    periodization: 'Block — semanas de força (A) alternam com semanas de volume (B)',
    goals: ['ganho_massa', 'recomposicao'],
    repRange: '5 reps (Força) / 10–15 reps (Volume)',
    rest: '3–5 min compostos força · 90s volume',
    level: 'Iniciante / Intermediário',
    science: 'Ralston et al. 2017: Upper/Lower 4x/sem produz hipertrofia equivalente ao PPL com menos fadiga acumulada. Ideal para iniciantes e recomposição.',
    exercises: [
      // Seg 1 — Upper A (Força)
      { name: 'Supino Reto com Barra',        icon: '🏋️', muscle_group: 'peito',   day_of_week: 1, sets: 4, reps: 5,  weight_kg: 0 },
      { name: 'Remada Curvada com Barra',     icon: '🏋️', muscle_group: 'costas',  day_of_week: 1, sets: 4, reps: 5,  weight_kg: 0 },
      { name: 'Desenvolvimento com Barra',    icon: '💪', muscle_group: 'ombros',  day_of_week: 1, sets: 3, reps: 8,  weight_kg: 0 },
      { name: 'Barra Fixa (Dominada)',        icon: '🏋️', muscle_group: 'costas',  day_of_week: 1, sets: 3, reps: 8,  weight_kg: 0 },
      { name: 'Rosca Direta com Barra',       icon: '💪', muscle_group: 'bíceps',  day_of_week: 1, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Tríceps Corda (Pulley)',        icon: '💪', muscle_group: 'tríceps', day_of_week: 1, sets: 3, reps: 10, weight_kg: 0 },
      // Ter 2 — Lower A (Força)
      { name: 'Agachamento Livre',            icon: '🦵', muscle_group: 'pernas',  day_of_week: 2, sets: 4, reps: 5,  weight_kg: 0 },
      { name: 'Levantamento Terra',           icon: '🏋️', muscle_group: 'costas',  day_of_week: 2, sets: 4, reps: 5,  weight_kg: 0 },
      { name: 'Leg Press 45°',                icon: '🦵', muscle_group: 'pernas',  day_of_week: 2, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Stiff (Romeno) com Barra',     icon: '🦵', muscle_group: 'glúteos', day_of_week: 2, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Panturrilha em Pé',            icon: '🦵', muscle_group: 'pernas',  day_of_week: 2, sets: 4, reps: 15, weight_kg: 0 },
      // Qui 4 — Upper B (Volume)
      { name: 'Supino Inclinado Halteres',    icon: '🏋️', muscle_group: 'peito',   day_of_week: 4, sets: 4, reps: 12, weight_kg: 0 },
      { name: 'Remada Serrote (Haltere)',     icon: '🏋️', muscle_group: 'costas',  day_of_week: 4, sets: 4, reps: 12, weight_kg: 0 },
      { name: 'Desenvolvimento com Halteres', icon: '💪', muscle_group: 'ombros',  day_of_week: 4, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Puxada Frontal (Lat Pulldown)',icon: '🏋️', muscle_group: 'costas',  day_of_week: 4, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Elevação Lateral',             icon: '💪', muscle_group: 'ombros',  day_of_week: 4, sets: 4, reps: 15, weight_kg: 0 },
      { name: 'Rosca Martelo + Tríceps Testa',icon: '💪', muscle_group: 'bíceps',  day_of_week: 4, sets: 3, reps: 12, weight_kg: 0 },
      // Sex 5 — Lower B (Volume)
      { name: 'Agachamento Goblet (Haltere)', icon: '🦵', muscle_group: 'pernas',  day_of_week: 5, sets: 4, reps: 12, weight_kg: 0 },
      { name: 'Avanço com Halteres',          icon: '🦵', muscle_group: 'pernas',  day_of_week: 5, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Extensão de Perna (Máq.)',     icon: '🦵', muscle_group: 'pernas',  day_of_week: 5, sets: 3, reps: 15, weight_kg: 0 },
      { name: 'Elevação de Quadril (Hip Thrust)',icon:'🦵',muscle_group: 'glúteos', day_of_week: 5, sets: 4, reps: 15, weight_kg: 0 },
      { name: 'Flexão de Perna Deitado',      icon: '🦵', muscle_group: 'pernas',  day_of_week: 5, sets: 3, reps: 15, weight_kg: 0 },
    ],
  },
  {
    id: 'fullbody',
    name: 'Full Body 3x',
    subtitle: '3 dias — todos os músculos em cada sessão',
    icon: '🔥',
    color: '#ff6b6b',
    days: 'Seg Full A · Qua Full B · Sex Full C',
    periodization: 'Linear — aumento semanal de carga de 1–2,5 kg/semana nos compostos',
    goals: ['emagrecimento', 'cutting', 'manutencao'],
    repRange: '8–15 reps (zona hipertrofia/definição)',
    rest: '60–90 seg entre séries',
    level: 'Iniciante / Intermediário',
    science: 'Helms et al. 2014 (JISSN): em déficit calórico, Full Body 3x/sem preserva massa magra ao manter estímulo em todos os grupos. Menor fadiga acumulada facilita aderência.',
    exercises: [
      // Seg 1 — Full Body A
      { name: 'Agachamento Livre',            icon: '🦵', muscle_group: 'pernas',  day_of_week: 1, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Supino Reto com Barra',        icon: '🏋️', muscle_group: 'peito',   day_of_week: 1, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Remada Curvada com Barra',     icon: '🏋️', muscle_group: 'costas',  day_of_week: 1, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Desenvolvimento com Halteres', icon: '💪', muscle_group: 'ombros',  day_of_week: 1, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Rosca Direta com Barra',       icon: '💪', muscle_group: 'bíceps',  day_of_week: 1, sets: 2, reps: 12, weight_kg: 0 },
      { name: 'Tríceps Corda (Pulley)',        icon: '💪', muscle_group: 'tríceps', day_of_week: 1, sets: 2, reps: 12, weight_kg: 0 },
      // Qua 3 — Full Body B
      { name: 'Levantamento Terra Romeno',    icon: '🦵', muscle_group: 'glúteos', day_of_week: 3, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Supino Inclinado Halteres',    icon: '🏋️', muscle_group: 'peito',   day_of_week: 3, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Barra Fixa (Dominada)',        icon: '🏋️', muscle_group: 'costas',  day_of_week: 3, sets: 3, reps: 8,  weight_kg: 0 },
      { name: 'Paralelas (Dips)',             icon: '💪', muscle_group: 'tríceps', day_of_week: 3, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Rosca Martelo com Halteres',   icon: '💪', muscle_group: 'bíceps',  day_of_week: 3, sets: 2, reps: 12, weight_kg: 0 },
      { name: 'Elevação Lateral',             icon: '💪', muscle_group: 'ombros',  day_of_week: 3, sets: 2, reps: 15, weight_kg: 0 },
      // Sex 5 — Full Body C
      { name: 'Leg Press 45°',                icon: '🦵', muscle_group: 'pernas',  day_of_week: 5, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Supino na Máquina',            icon: '🏋️', muscle_group: 'peito',   day_of_week: 5, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Remada na Máquina',            icon: '🏋️', muscle_group: 'costas',  day_of_week: 5, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Elevação Lateral no Cabo',     icon: '💪', muscle_group: 'ombros',  day_of_week: 5, sets: 3, reps: 15, weight_kg: 0 },
      { name: 'Rosca com Cabo',               icon: '💪', muscle_group: 'bíceps',  day_of_week: 5, sets: 2, reps: 15, weight_kg: 0 },
      { name: 'Tríceps Testa (Skull Crusher)',icon: '💪', muscle_group: 'tríceps', day_of_week: 5, sets: 2, reps: 12, weight_kg: 0 },
    ],
  },
  {
    id: 'abc',
    name: 'ABC Clássico',
    subtitle: '3 dias — grupos musculares dedicados',
    icon: '⚖️',
    color: '#c77dff',
    days: 'Seg Peito+Tri · Qua Costas+Bi · Sex Pernas+Ombros',
    periodization: 'Linear por fase: 4 sem hipertrofia (8–12) → 4 sem força (5–8) → deload',
    goals: ['recomposicao', 'ganho_massa'],
    repRange: '6–15 reps (varia por fase)',
    rest: '90s–2 min entre séries',
    level: 'Intermediário',
    science: 'Programa clássico com evidências sólidas. Schoenfeld 2010: volume suficiente por grupo por sessão gera overload mecânico e metabólico ideais para hipertrofia.',
    exercises: [
      // Seg 1 — A: Peito + Tríceps
      { name: 'Supino Reto com Barra',        icon: '🏋️', muscle_group: 'peito',   day_of_week: 1, sets: 4, reps: 8,  weight_kg: 0 },
      { name: 'Supino Inclinado Halteres',    icon: '🏋️', muscle_group: 'peito',   day_of_week: 1, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Crucifixo com Halteres',       icon: '🏋️', muscle_group: 'peito',   day_of_week: 1, sets: 3, reps: 15, weight_kg: 0 },
      { name: 'Paralelas (Dips)',             icon: '💪', muscle_group: 'tríceps', day_of_week: 1, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Tríceps Corda (Pulley)',        icon: '💪', muscle_group: 'tríceps', day_of_week: 1, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Tríceps Testa (Skull Crusher)',icon: '💪', muscle_group: 'tríceps', day_of_week: 1, sets: 3, reps: 12, weight_kg: 0 },
      // Qua 3 — B: Costas + Bíceps
      { name: 'Levantamento Terra',           icon: '🏋️', muscle_group: 'costas',  day_of_week: 3, sets: 4, reps: 6,  weight_kg: 0 },
      { name: 'Remada Curvada com Barra',     icon: '🏋️', muscle_group: 'costas',  day_of_week: 3, sets: 4, reps: 10, weight_kg: 0 },
      { name: 'Puxada Frontal (Lat Pulldown)',icon: '🏋️', muscle_group: 'costas',  day_of_week: 3, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Remada Serrote (Haltere)',     icon: '🏋️', muscle_group: 'costas',  day_of_week: 3, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Rosca Direta com Barra',       icon: '💪', muscle_group: 'bíceps',  day_of_week: 3, sets: 3, reps: 10, weight_kg: 0 },
      { name: 'Rosca Martelo com Halteres',   icon: '💪', muscle_group: 'bíceps',  day_of_week: 3, sets: 3, reps: 12, weight_kg: 0 },
      // Sex 5 — C: Pernas + Ombros
      { name: 'Agachamento Livre',            icon: '🦵', muscle_group: 'pernas',  day_of_week: 5, sets: 4, reps: 8,  weight_kg: 0 },
      { name: 'Leg Press 45°',                icon: '🦵', muscle_group: 'pernas',  day_of_week: 5, sets: 4, reps: 12, weight_kg: 0 },
      { name: 'Stiff (Romeno) com Barra',     icon: '🦵', muscle_group: 'glúteos', day_of_week: 5, sets: 3, reps: 12, weight_kg: 0 },
      { name: 'Desenvolvimento com Barra',    icon: '💪', muscle_group: 'ombros',  day_of_week: 5, sets: 4, reps: 8,  weight_kg: 0 },
      { name: 'Elevação Lateral',             icon: '💪', muscle_group: 'ombros',  day_of_week: 5, sets: 4, reps: 15, weight_kg: 0 },
      { name: 'Face Pull (Cabo)',             icon: '💪', muscle_group: 'ombros',  day_of_week: 5, sets: 3, reps: 15, weight_kg: 0 },
    ],
  },
]

// ── Props ───────────────────────────────────────────────────────────
interface Props {
  exercises: Exercise[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addExercise: (ex: any) => Promise<unknown>
  onRefresh: () => void
}

// ── Periodization week tracker ──────────────────────────────────────
function usePeriodization() {
  const [startDate, setStartDate] = useState<string | null>(null)

  useEffect(() => {
    setStartDate(localStorage.getItem('nexus_training_start') ?? null)
  }, [])

  const weekNum = useMemo(() => {
    if (!startDate) return null
    const diff = Date.now() - new Date(startDate).getTime()
    return Math.max(1, Math.ceil(diff / (7 * 24 * 3600 * 1000)))
  }, [startDate])

  const isDeload = weekNum !== null && weekNum % 4 === 0
  const nextDeload = weekNum !== null ? 4 - (weekNum % 4) : null

  const start = () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('nexus_training_start', today)
    setStartDate(today)
  }

  const reset = () => {
    localStorage.removeItem('nexus_training_start')
    setStartDate(null)
  }

  return { weekNum, isDeload, nextDeload, start, reset, startDate }
}

// ── Volume zone ─────────────────────────────────────────────────────
function volZone(sets: number, muscle: string): 'below' | 'mev' | 'mav' | 'mrv' {
  const v = VOL[muscle]
  if (!v) return 'mev'
  if (sets < v.mev) return 'below'
  if (sets < v.mavMin) return 'mev'
  if (sets <= v.mrv) return 'mav'
  return 'mrv'
}

const ZONE_COLOR: Record<string, string> = {
  below: '#4d96ff',
  mev:   '#ffd93d',
  mav:   '#6bcb77',
  mrv:   '#ff6b6b',
}
const ZONE_LABEL: Record<string, string> = {
  below: 'Abaixo MEV',
  mev:   'MEV — Mínimo',
  mav:   'MAV — Ideal ✓',
  mrv:   'MRV — Máximo',
}

// ── Main component ──────────────────────────────────────────────────
export function WorkoutPlans({ exercises, addExercise, onRefresh }: Props) {
  const [goal, setGoal] = useState<GoalKey | null>(null)
  const [importing, setImporting] = useState<string | null>(null)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null)
  const { weekNum, isDeload, nextDeload, start, reset, startDate } = usePeriodization()

  useEffect(() => {
    const p = localStorage.getItem('nexus_fitness_profile')
    if (p) setGoal(JSON.parse(p).goal as GoalKey)
  }, [])

  // Weekly sets per muscle group
  const weeklyVol = useMemo(() => {
    const out: Record<string, number> = {}
    for (const ex of exercises) {
      if (!ex.muscle_group) continue
      out[ex.muscle_group] = (out[ex.muscle_group] ?? 0) + ex.sets
    }
    return out
  }, [exercises])

  const handleImport = async (programId: string) => {
    const program = PROGRAMS.find(p => p.id === programId)
    if (!program) return
    setImporting(programId)
    setConfirmPlan(null)
    for (const ex of program.exercises) {
      await addExercise(ex)
      await new Promise(r => setTimeout(r, 60)) // avoid rate limit
    }
    setImporting(null)
    onRefresh()
  }

  const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Periodization tracker ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📅 Periodização</div>
            {!startDate ? (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Inicie o ciclo para rastrear semanas de treino e deload</div>
            ) : isDeload ? (
              <div style={{ fontSize: 12, color: '#ffd93d', fontWeight: 600 }}>⚠️ Semana {weekNum} — DELOAD esta semana! Reduza volume 40–50% e intensidade 10–15%.</div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Semana <strong style={{ color: 'var(--accent)' }}>{weekNum}</strong> de treino
                &nbsp;·&nbsp; próximo deload em <strong style={{ color: '#ffd93d' }}>{nextDeload}</strong> sem.
                &nbsp;·&nbsp; Início: {new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!startDate ? (
              <button onClick={start}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                🚀 Iniciar ciclo
              </button>
            ) : (
              <button onClick={reset}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>
                Reiniciar
              </button>
            )}
          </div>
        </div>
        {startDate && (
          <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' }}>
            {Array.from({ length: Math.max(weekNum ?? 1, 8) }, (_, i) => i + 1).map(w => {
              const isDeloadW = w % 4 === 0
              const isCurrent = w === weekNum
              return (
                <div key={w} style={{ width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: isCurrent ? 'var(--accent)30' : isDeloadW ? '#ffd93d20' : (w < (weekNum ?? 0) ? 'var(--bg3)' : 'transparent'),
                  color: isCurrent ? 'var(--accent)' : isDeloadW ? '#ffd93d' : w < (weekNum ?? 0) ? 'var(--text3)' : 'var(--text3)',
                  opacity: w > (weekNum ?? 0) ? 0.3 : 1 }}>
                  {isDeloadW ? 'D' : w}
                </div>
              )
            })}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8 }}>
          ■ semana normal &nbsp;·&nbsp; <span style={{ color: '#ffd93d' }}>D</span> = deload a cada 4 semanas (Israetel et al.) &nbsp;·&nbsp; <span style={{ color: 'var(--accent)' }}>■</span> semana atual
        </div>
      </div>

      {/* ── Weekly volume tracker ── */}
      {Object.keys(VOL).length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📊 Volume Semanal por Músculo</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>
            Baseado nos seus exercícios cadastrados · MEV=mínimo · MAV=ideal · MRV=máximo (Israetel / RP)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {Object.entries(VOL).map(([muscle, v]) => {
              const sets = weeklyVol[muscle] ?? 0
              const zone = volZone(sets, muscle)
              const color = ZONE_COLOR[zone]
              const pct = Math.min((sets / v.mrv) * 100, 100)
              return (
                <div key={muscle} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{muscle}</span>
                    <span style={{ fontSize: 11, color, fontWeight: 700 }}>{sets} sets</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 100, overflow: 'hidden', marginBottom: 4, position: 'relative' }}>
                    {/* MEV marker */}
                    <div style={{ position: 'absolute', left: `${(v.mev / v.mrv) * 100}%`, top: 0, width: 2, height: '100%', background: '#ffd93d60', zIndex: 1 }} />
                    {/* MAV zone */}
                    <div style={{ position: 'absolute', left: `${(v.mavMin / v.mrv) * 100}%`, width: `${((v.mavMax - v.mavMin) / v.mrv) * 100}%`, top: 0, height: '100%', background: '#6bcb7730' }} />
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width .3s', position: 'relative', zIndex: 2 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)' }}>
                    <span>MEV {v.mev}</span>
                    <span style={{ color }}>{ZONE_LABEL[zone]}</span>
                    <span>MRV {v.mrv}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Program library ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📋 Programas de Treino</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: goal ? 10 : 16 }}>
          Baseados em pesquisas peer-reviewed (Schoenfeld, Israetel, Krieger, Helms). Importe um programa e os exercícios serão adicionados automaticamente.
        </div>
        {goal && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'var(--accent)20', border: '1px solid var(--accent)40', marginBottom: 16, fontSize: 12 }}>
            <span style={{ color: 'var(--accent)' }}>🎯 Objetivo atual:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{GOAL_LABEL[goal]}</span>
            <span style={{ color: 'var(--text3)' }}>— programas recomendados em destaque</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {PROGRAMS.map(prog => {
            const isRecommended = goal ? prog.goals.includes(goal) : false
            const isExpanded = expandedPlan === prog.id
            const isImporting = importing === prog.id

            return (
              <div key={prog.id} style={{ border: `2px solid ${isRecommended ? prog.color : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden',
                background: isRecommended ? `${prog.color}08` : 'var(--bg3)', transition: 'border-color .2s' }}>
                {/* Header */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 18 }}>{prog.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{prog.name}</span>
                        {isRecommended && (
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: `${prog.color}25`, color: prog.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>
                            ✓ Recomendado
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{prog.subtitle}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.6 }}>
                    <div>🗓️ {prog.days}</div>
                    <div>📈 {prog.periodization}</div>
                    <div>🔄 {prog.repRange} &nbsp;·&nbsp; ⏱️ {prog.rest}</div>
                    <div>👤 {prog.level}</div>
                  </div>

                  {/* Applicable goals */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {prog.goals.map(g => (
                      <span key={g} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10,
                        background: goal === g ? `${prog.color}25` : 'var(--bg2)', color: goal === g ? prog.color : 'var(--text3)', fontWeight: 500 }}>
                        {GOAL_LABEL[g]}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setExpandedPlan(isExpanded ? null : prog.id)}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>
                      {isExpanded ? '▲ Ocultar' : '▼ Ver exercícios'}
                    </button>
                    <button
                      onClick={() => setConfirmPlan(prog.id)}
                      disabled={!!importing}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                        background: isImporting ? 'var(--bg3)' : prog.color, color: '#fff',
                        fontSize: 12, fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing && !isImporting ? 0.5 : 1 }}>
                      {isImporting ? '⏳ Importando...' : '⬇ Importar'}
                    </button>
                  </div>
                </div>

                {/* Exercises list */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Exercícios do programa</div>
                    {[0,1,2,3,4,5,6].map(dow => {
                      const exs = prog.exercises.filter(e => e.day_of_week === dow)
                      if (!exs.length) return null
                      return (
                        <div key={dow} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: prog.color, marginBottom: 4 }}>{DAYS_SHORT[dow]}</div>
                          {exs.map((ex, i) => (
                            <div key={i} style={{ fontSize: 11, color: 'var(--text3)', padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{ex.icon} {ex.name}</span>
                              <span style={{ color: 'var(--text3)' }}>{ex.sets}×{ex.reps}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                    {/* Science note */}
                    <div style={{ marginTop: 10, padding: '10px 12px', background: `${prog.color}10`, border: `1px solid ${prog.color}30`, borderRadius: 8, fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
                      📚 {prog.science}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm import modal */}
      {confirmPlan && (
        <div style={{ position: 'fixed', inset: 0, background: '#0009', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmPlan(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 380, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>⬇ Importar programa?</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
              Os exercícios do programa <strong style={{ color: 'var(--text)' }}>{PROGRAMS.find(p => p.id === confirmPlan)?.name}</strong> serão
              adicionados à sua agenda. Exercícios existentes não serão removidos.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmPlan(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={() => handleImport(confirmPlan)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
