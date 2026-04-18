'use client'

import { useState, useEffect, useMemo } from 'react'

// ── Types ───────────────────────────────────────────────────────────
type Sex = 'm' | 'f'
type Activity = '1.2' | '1.375' | '1.55' | '1.725' | '1.9'
type GoalKey = 'emagrecimento' | 'recomposicao' | 'ganho_massa' | 'bulking' | 'cutting' | 'manutencao'

interface FitnessProfile {
  weight: number   // kg
  height: number   // cm
  age: number
  sex: Sex
  activity: Activity
  goal: GoalKey
}

interface Macros {
  kcal: number
  protein: number  // g
  carbs: number    // g
  fat: number      // g
}

// ── Goal definitions (science-based) ───────────────────────────────
// Sources: Morton et al. 2018 (BJSM), Helms et al. 2014 (JISSN),
//          Iraki et al. 2019 (JISSN), ACSM Position Stand 2009
const GOALS: Record<GoalKey, {
  label: string; icon: string; color: string; description: string
  calorieAdjust: number   // kcal delta from TDEE
  proteinPerKg: number    // g/kg body weight
  fatPerKg: number        // g/kg body weight (remaining = carbs)
  minFatPct: number       // minimum % total calories from fat
  sciNote: string
}> = {
  emagrecimento: {
    label: 'Emagrecimento', icon: '🔥', color: '#ff6b6b',
    description: 'Déficit moderado preservando músculo',
    calorieAdjust: -400,
    proteinPerKg: 2.0,   // Hall & Layman consensus
    fatPerKg: 0.8,
    minFatPct: 20,
    sciNote: 'Déficit de 400 kcal/dia → ~0,4 kg/semana de gordura. Proteína alta (2g/kg) protege massa magra durante o déficit.',
  },
  recomposicao: {
    label: 'Recomposição', icon: '⚖️', color: '#c77dff',
    description: 'Perder gordura e ganhar músculo ao mesmo tempo',
    calorieAdjust: -150,
    proteinPerKg: 2.2,   // Barakat et al. 2020
    fatPerKg: 1.0,
    minFatPct: 25,
    sciNote: 'Recomposição funciona especialmente para iniciantes e quem retorna ao treino. Proteína muito elevada + treino resistido.',
  },
  ganho_massa: {
    label: 'Ganho de Massa', icon: '💪', color: '#6bcb77',
    description: 'Superávit limpo com mínimo acúmulo de gordura',
    calorieAdjust: 250,
    proteinPerKg: 1.8,   // Morton et al. 2018 meta-analysis
    fatPerKg: 0.8,
    minFatPct: 20,
    sciNote: 'Superávit de 250 kcal = lean bulk. Máximo de síntese protéica com mínimo ganho de gordura (Slater & Phillips 2011).',
  },
  bulking: {
    label: 'Bulking', icon: '🏋️', color: '#4d96ff',
    description: 'Superávit agressivo para máximo ganho de massa',
    calorieAdjust: 400,
    proteinPerKg: 1.6,   // Minimum effective dose (Morton et al. 2018)
    fatPerKg: 1.0,
    minFatPct: 25,
    sciNote: 'Superávit maior acelera ganhos mas pode acumular mais gordura. Recomendado para hardgainers ou fora de temporada.',
  },
  cutting: {
    label: 'Cutting', icon: '✂️', color: '#ffd93d',
    description: 'Déficit intenso preservando ao máximo a massa muscular',
    calorieAdjust: -500,
    proteinPerKg: 2.5,   // Helms et al. 2014 — natural athletes cutting
    fatPerKg: 0.6,       // Minimum hormonal health (Hamalainen et al. 1984)
    minFatPct: 15,
    sciNote: 'Helms et al. 2014 (JISSN): atletas naturais em cutting precisam de 2,3–3,1g/kg de proteína para preservar massa magra.',
  },
  manutencao: {
    label: 'Manutenção', icon: '🎯', color: '#00d4aa',
    description: 'Manter peso e composição corporal atual',
    calorieAdjust: 0,
    proteinPerKg: 1.6,   // RDA recommended for active adults
    fatPerKg: 0.8,
    minFatPct: 20,
    sciNote: 'ACSM 2009: adultos ativos precisam de 1,4–1,8g/kg de proteína. Mantendo TDEE sem déficit ou superávit.',
  },
}

const ACTIVITIES: { val: Activity; label: string }[] = [
  { val: '1.2',   label: 'Sedentário (sem exercício)' },
  { val: '1.375', label: 'Leve (1–3x/semana)' },
  { val: '1.55',  label: 'Moderado (3–5x/semana)' },
  { val: '1.725', label: 'Muito ativo (6–7x/semana)' },
  { val: '1.9',   label: 'Extremamente ativo (2x/dia)' },
]

// ── BMI ─────────────────────────────────────────────────────────────
function calcBMI(weight: number, height: number) {
  const bmi = weight / Math.pow(height / 100, 2)
  if (bmi < 18.5) return { bmi, label: 'Abaixo do peso', color: '#4d96ff',   rec: ['bulking', 'ganho_massa'] as GoalKey[] }
  if (bmi < 25.0) return { bmi, label: 'Peso normal',    color: '#6bcb77',   rec: ['ganho_massa', 'manutencao', 'recomposicao'] as GoalKey[] }
  if (bmi < 30.0) return { bmi, label: 'Sobrepeso',      color: '#ffd93d',   rec: ['emagrecimento', 'recomposicao', 'cutting'] as GoalKey[] }
  if (bmi < 35.0) return { bmi, label: 'Obesidade I',    color: '#ff9a3c',   rec: ['emagrecimento'] as GoalKey[] }
  return               { bmi, label: 'Obesidade II+',    color: '#ff6b6b',   rec: ['emagrecimento'] as GoalKey[] }
}

// ── TDEE (Mifflin-St Jeor) ──────────────────────────────────────────
function calcTDEE(p: FitnessProfile): number {
  const bmr = p.sex === 'm'
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
    : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161
  return Math.round(bmr * parseFloat(p.activity))
}

// ── Macro targets ───────────────────────────────────────────────────
function calcMacros(p: FitnessProfile, tdee: number): Macros {
  const g = GOALS[p.goal]
  const targetKcal = Math.max(1200, tdee + g.calorieAdjust)
  const protein = Math.round(p.weight * g.proteinPerKg)
  const fat     = Math.max(
    Math.round(p.weight * g.fatPerKg),
    Math.round((targetKcal * g.minFatPct / 100) / 9)
  )
  const proteinKcal = protein * 4
  const fatKcal     = fat * 9
  const carbsKcal   = Math.max(0, targetKcal - proteinKcal - fatKcal)
  const carbs       = Math.round(carbsKcal / 4)
  return { kcal: targetKcal, protein, fat, carbs }
}

// ── Progress bar ────────────────────────────────────────────────────
function MacroBar({ label, current, target, color, unit = 'g' }: {
  label: string; current: number; target: number; color: string; unit?: string
}) {
  const pct = Math.min((current / target) * 100, 100)
  const over = current > target
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 600, color: over ? '#ff6b6b' : 'var(--text)' }}>
          {Math.round(current)}{unit} / {target}{unit}
          {over && <span style={{ fontSize: 10, marginLeft: 4, color: '#ff6b6b' }}>+{Math.round(current - target)}</span>}
        </span>
      </div>
      <div style={{ height: 7, background: 'var(--bg)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: over ? '#ff6b6b' : color, borderRadius: 100, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

// ── Profile Setup Modal ─────────────────────────────────────────────
function ProfileModal({ initial, onSave, onClose }: {
  initial: Partial<FitnessProfile>
  onSave: (p: FitnessProfile) => void
  onClose: () => void
}) {
  const [sex,      setSex]      = useState<Sex>(initial.sex ?? 'm')
  const [age,      setAge]      = useState(initial.age?.toString() ?? '')
  const [weight,   setWeight]   = useState(initial.weight?.toString() ?? '')
  const [height,   setHeight]   = useState(initial.height?.toString() ?? '')
  const [activity, setActivity] = useState<Activity>(initial.activity ?? '1.55')
  const [goal,     setGoal]     = useState<GoalKey>(initial.goal ?? 'manutencao')

  const canSave = age && weight && height && parseFloat(weight) > 0 && parseFloat(height) > 0 && parseInt(age) > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({ sex, age: parseInt(age), weight: parseFloat(weight), height: parseFloat(height), activity, goal })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0009', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>⚙️ Perfil Fitness</h3>
        <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 20px' }}>Preencha para calcular suas metas de macronutrientes</p>

        {/* Sex */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Sexo biológico</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['m', 'f'] as const).map(s => (
              <button key={s} onClick={() => setSex(s)}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: `2px solid ${sex === s ? 'var(--accent)' : 'var(--border)'}`,
                  background: sex === s ? 'var(--accent)20' : 'var(--bg3)', cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                {s === 'm' ? '♂ Masculino' : '♀ Feminino'}
              </button>
            ))}
          </div>
        </div>

        {/* Numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Idade', val: age,    set: setAge,    ph: '28',  unit: 'anos' },
            { label: 'Peso',  val: weight, set: setWeight, ph: '75',  unit: 'kg' },
            { label: 'Altura',val: height, set: setHeight, ph: '175', unit: 'cm' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{f.label} ({f.unit})</label>
              <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>

        {/* Activity */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Nível de atividade física</label>
          <select value={activity} onChange={e => setActivity(e.target.value as Activity)}
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 12, outline: 'none' }}>
            {ACTIVITIES.map(a => <option key={a.val} value={a.val}>{a.label}</option>)}
          </select>
        </div>

        {/* Goal */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>Objetivo</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.entries(GOALS) as [GoalKey, typeof GOALS[GoalKey]][]).map(([key, g]) => (
              <button key={key} onClick={() => setGoal(key)}
                style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${goal === key ? g.color : 'var(--border)'}`,
                  background: goal === key ? `${g.color}18` : 'var(--bg3)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: goal === key ? g.color : 'var(--text)' }}>{g.icon} {g.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{g.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', cursor: 'pointer', fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: canSave ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, opacity: canSave ? 1 : 0.5 }}>
            Salvar perfil
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────
interface Props {
  todayKcal: number
  todayProtein: number
  todayCarbs: number
  todayFat: number
}

export function FitnessGoals({ todayKcal, todayProtein, todayCarbs, todayFat }: Props) {
  const [profile, setProfile] = useState<FitnessProfile | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('nexus_fitness_profile')
    if (saved) setProfile(JSON.parse(saved))
  }, [])

  const saveProfile = (p: FitnessProfile) => {
    setProfile(p)
    localStorage.setItem('nexus_fitness_profile', JSON.stringify(p))
    localStorage.setItem('nexus_calorie_goal', String(calcTDEE(p) + GOALS[p.goal].calorieAdjust))
    setShowModal(false)
  }

  const tdee   = profile ? calcTDEE(profile) : null
  const macros = profile && tdee ? calcMacros(profile, tdee) : null
  const bmiData = profile ? calcBMI(profile.weight, profile.height) : null
  const goalInfo = profile ? GOALS[profile.goal] : null

  const bmiPct = useMemo(() => {
    if (!bmiData) return 0
    // BMI scale: 15 (min) to 40 (max)
    return Math.min(Math.max(((bmiData.bmi - 15) / 25) * 100, 0), 100)
  }, [bmiData])

  if (!profile) {
    return (
      <>
        {showModal && <ProfileModal initial={{}} onSave={saveProfile} onClose={() => setShowModal(false)} />}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, gridColumn: '1 / -1', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏋️</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Metas Fitness Personalizadas</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Configure seu perfil para receber metas de calorias e macronutrientes baseadas na ciência, de acordo com seu objetivo.
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Configurar perfil
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {showModal && <ProfileModal initial={profile} onSave={saveProfile} onClose={() => setShowModal(false)} />}

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, gridColumn: '1 / -1' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{goalInfo!.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Metas Fitness</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${goalInfo!.color}20`, color: goalInfo!.color, fontWeight: 600 }}>
                {goalInfo!.label}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{goalInfo!.description}</div>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>
            ⚙️ Editar perfil
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>

          {/* IMC + TDEE */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5 }}>Dados corporais</div>

            {/* IMC gauge */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>IMC</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: bmiData!.color }}>{bmiData!.bmi.toFixed(1)} — {bmiData!.label}</span>
              </div>
              {/* Colored scale */}
              <div style={{ position: 'relative', height: 10, borderRadius: 100, overflow: 'hidden', marginBottom: 4,
                background: 'linear-gradient(to right, #4d96ff 0%, #6bcb77 20%, #6bcb77 50%, #ffd93d 65%, #ff9a3c 80%, #ff6b6b 100%)' }}>
                <div style={{ position: 'absolute', top: -2, width: 14, height: 14, borderRadius: 100, background: '#fff', border: `3px solid ${bmiData!.color}`, transition: 'left .4s',
                  left: `calc(${bmiPct}% - 7px)` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)' }}>
                <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40+</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Peso',         val: `${profile.weight} kg` },
                { label: 'Altura',        val: `${profile.height} cm` },
                { label: 'TDEE',          val: `${tdee} kcal` },
                { label: 'Meta calórica', val: `${macros!.kcal} kcal`, highlight: true },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: item.highlight ? goalInfo!.color : 'var(--text)' }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* BMI recommendation */}
            {bmiData!.rec.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)', background: 'var(--bg2)', borderRadius: 8, padding: '8px 12px' }}>
                💡 Para o seu IMC, objetivos recomendados:{' '}
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                  {bmiData!.rec.map(r => GOALS[r].label).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Macro targets + today's progress */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5 }}>Progresso de hoje</div>

            <MacroBar label="🔥 Calorias"   current={todayKcal}    target={macros!.kcal}    color={goalInfo!.color} unit=" kcal" />
            <MacroBar label="🥩 Proteína"   current={todayProtein} target={macros!.protein} color="#4d96ff" />
            <MacroBar label="🌾 Carboidrato" current={todayCarbs}   target={macros!.carbs}   color="#ffd93d" />
            <MacroBar label="🫒 Gordura"     current={todayFat}     target={macros!.fat}     color="#ff9a3c" />

            {/* Macro split */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Distribuição de macros (meta)</div>
              <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 100, overflow: 'hidden', marginBottom: 8 }}>
                {[
                  { pct: (macros!.protein * 4 / macros!.kcal) * 100, color: '#4d96ff' },
                  { pct: (macros!.carbs   * 4 / macros!.kcal) * 100, color: '#ffd93d' },
                  { pct: (macros!.fat     * 9 / macros!.kcal) * 100, color: '#ff9a3c' },
                ].map((s, i) => (
                  <div key={i} style={{ height: '100%', width: `${s.pct}%`, background: s.color }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                {[
                  { label: 'P', val: macros!.protein, cal: macros!.protein * 4, color: '#4d96ff' },
                  { label: 'C', val: macros!.carbs,   cal: macros!.carbs * 4,   color: '#ffd93d' },
                  { label: 'G', val: macros!.fat,     cal: macros!.fat * 9,     color: '#ff9a3c' },
                ].map(m => (
                  <div key={m.label}>
                    <span style={{ color: m.color, fontWeight: 700 }}>{m.label} </span>
                    <span style={{ color: 'var(--text)' }}>{m.val}g </span>
                    <span style={{ color: 'var(--text3)' }}>({Math.round(m.cal / macros!.kcal * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per-kg breakdown + science note */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5 }}>Metas por kg de peso</div>

            {[
              { label: '🥩 Proteína',    val: GOALS[profile.goal].proteinPerKg, total: macros!.protein, color: '#4d96ff', unit: 'g/kg', desc: 'Base: Morton et al. 2018' },
              { label: '🌾 Carboidrato', val: +(macros!.carbs / profile.weight).toFixed(1), total: macros!.carbs,   color: '#ffd93d', unit: 'g/kg', desc: 'Restante das calorias' },
              { label: '🫒 Gordura',      val: GOALS[profile.goal].fatPerKg,    total: macros!.fat,     color: '#ff9a3c', unit: 'g/kg', desc: 'Mínimo hormonal (0.5g/kg)' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.val} {m.unit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                  <span>{m.desc}</span>
                  <span style={{ color: 'var(--text)' }}>{m.total}g/dia</span>
                </div>
              </div>
            ))}

            {/* Science note */}
            <div style={{ background: `${goalInfo!.color}10`, border: `1px solid ${goalInfo!.color}30`, borderRadius: 8, padding: '10px 12px', marginTop: 4 }}>
              <div style={{ fontSize: 10, color: goalInfo!.color, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>📚 Base científica</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{goalInfo!.sciNote}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
