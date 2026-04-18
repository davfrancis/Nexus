'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useHealth } from '@/hooks/useHealth'
import { format } from 'date-fns'

// ── Mood options ────────────────────────────────────────────────────
const MOODS = [
  { value: '😤', label: 'Estressado' },
  { value: '😔', label: 'Triste' },
  { value: '😐', label: 'Neutro' },
  { value: '🙂', label: 'Bem' },
  { value: '😄', label: 'Ótimo' },
]

// ── Food database (kcal, protein, carbs, fat per 100g) ──────────────
type FoodItem = { name: string; kcal: number; p: number; c: number; f: number; unit?: string }

const FOODS: FoodItem[] = [
  // Cereais e grãos
  { name: 'Arroz branco cozido',        kcal: 130, p: 2.5,  c: 28.1, f: 0.2 },
  { name: 'Arroz integral cozido',      kcal: 124, p: 2.6,  c: 25.8, f: 1.0 },
  { name: 'Feijão cozido',              kcal: 76,  p: 4.8,  c: 13.6, f: 0.5 },
  { name: 'Feijão preto cozido',        kcal: 80,  p: 5.3,  c: 14.0, f: 0.5 },
  { name: 'Lentilha cozida',            kcal: 116, p: 9.0,  c: 20.1, f: 0.4 },
  { name: 'Macarrão cozido',            kcal: 131, p: 4.5,  c: 26.2, f: 0.9 },
  { name: 'Pão francês',               kcal: 300, p: 8.1,  c: 58.6, f: 3.1 },
  { name: 'Pão de forma integral',      kcal: 243, p: 9.7,  c: 43.0, f: 4.2 },
  { name: 'Pão de forma branco',        kcal: 266, p: 8.0,  c: 49.4, f: 4.6 },
  { name: 'Aveia em flocos',            kcal: 394, p: 13.9, c: 66.6, f: 8.5 },
  { name: 'Granola',                    kcal: 440, p: 9.0,  c: 67.0, f: 16.0 },
  { name: 'Batata cozida',             kcal: 87,  p: 2.0,  c: 19.8, f: 0.1 },
  { name: 'Batata doce cozida',        kcal: 77,  p: 1.4,  c: 17.6, f: 0.1 },
  { name: 'Mandioca cozida',           kcal: 125, p: 0.9,  c: 29.6, f: 0.3 },
  { name: 'Tapioca (beiju seco)',       kcal: 350, p: 0.2,  c: 86.4, f: 0.0 },
  { name: 'Farinha de milho',          kcal: 361, p: 7.3,  c: 78.0, f: 1.3 },
  // Proteínas animais
  { name: 'Frango grelhado (peito)',    kcal: 159, p: 32.0, c: 0.0,  f: 3.2 },
  { name: 'Frango assado (coxa)',       kcal: 215, p: 26.0, c: 0.0,  f: 12.0 },
  { name: 'Frango cozido (desfiad.)',   kcal: 173, p: 32.8, c: 0.0,  f: 4.4 },
  { name: 'Carne bovina patinho',       kcal: 219, p: 32.7, c: 0.0,  f: 9.4 },
  { name: 'Carne moída refogada',       kcal: 287, p: 26.0, c: 0.0,  f: 19.7 },
  { name: 'Picanha grelhada',           kcal: 290, p: 28.0, c: 0.0,  f: 19.0 },
  { name: 'Alcatra grelhada',           kcal: 208, p: 30.0, c: 0.0,  f: 9.6 },
  { name: 'Costela bovina assada',      kcal: 340, p: 24.0, c: 0.0,  f: 27.0 },
  { name: 'Porco lombo grelhado',       kcal: 196, p: 27.0, c: 0.0,  f: 9.5 },
  { name: 'Ovo cozido (50g = 1 un)',    kcal: 144, p: 12.6, c: 0.7,  f: 9.7,  unit: 'un' },
  { name: 'Ovo mexido',                 kcal: 168, p: 11.0, c: 1.9,  f: 13.0 },
  { name: 'Atum em água (lata)',        kcal: 109, p: 23.5, c: 0.0,  f: 1.0 },
  { name: 'Sardinha em óleo',          kcal: 208, p: 21.0, c: 0.0,  f: 13.4 },
  { name: 'Salmão grelhado',           kcal: 206, p: 28.0, c: 0.0,  f: 10.0 },
  { name: 'Tilápia grelhada',          kcal: 96,  p: 20.0, c: 0.0,  f: 1.7 },
  { name: 'Camarão cozido',            kcal: 99,  p: 20.9, c: 0.2,  f: 1.4 },
  { name: 'Presunto magro',            kcal: 145, p: 16.5, c: 1.0,  f: 8.2 },
  { name: 'Linguiça toscana grelhada', kcal: 312, p: 17.0, c: 1.0,  f: 26.5 },
  { name: 'Bacon grelhado',            kcal: 541, p: 37.0, c: 1.5,  f: 42.0 },
  // Laticínios
  { name: 'Leite integral (200ml)',     kcal: 122, p: 6.4,  c: 9.4,  f: 6.6,  unit: 'ml' },
  { name: 'Leite desnatado (200ml)',    kcal: 70,  p: 7.0,  c: 9.8,  f: 0.2,  unit: 'ml' },
  { name: 'Iogurte natural integral',   kcal: 66,  p: 4.0,  c: 5.0,  f: 3.3 },
  { name: 'Iogurte grego',             kcal: 100, p: 9.0,  c: 4.0,  f: 5.0 },
  { name: 'Queijo mussarela',          kcal: 300, p: 22.4, c: 2.1,  f: 22.6 },
  { name: 'Queijo prato',              kcal: 358, p: 24.6, c: 2.5,  f: 27.8 },
  { name: 'Queijo cottage',            kcal: 97,  p: 12.6, c: 2.7,  f: 4.0 },
  { name: 'Requeijão',                 kcal: 249, p: 9.2,  c: 3.1,  f: 22.3 },
  // Frutas
  { name: 'Banana prata',              kcal: 98,  p: 1.3,  c: 22.8, f: 0.1 },
  { name: 'Banana nanica',             kcal: 92,  p: 1.3,  c: 21.3, f: 0.1 },
  { name: 'Maçã',                      kcal: 56,  p: 0.3,  c: 13.9, f: 0.4 },
  { name: 'Laranja',                   kcal: 47,  p: 0.9,  c: 11.0, f: 0.1 },
  { name: 'Mamão papaya',              kcal: 40,  p: 0.5,  c: 9.8,  f: 0.1 },
  { name: 'Manga',                     kcal: 66,  p: 0.6,  c: 16.5, f: 0.3 },
  { name: 'Abacate',                   kcal: 160, p: 2.1,  c: 6.0,  f: 15.4 },
  { name: 'Uva',                       kcal: 69,  p: 0.6,  c: 17.3, f: 0.3 },
  { name: 'Morango',                   kcal: 34,  p: 0.7,  c: 8.0,  f: 0.3 },
  { name: 'Melancia',                  kcal: 33,  p: 0.9,  c: 7.7,  f: 0.2 },
  { name: 'Abacaxi',                   kcal: 50,  p: 0.9,  c: 12.3, f: 0.1 },
  { name: 'Kiwi',                      kcal: 61,  p: 0.9,  c: 14.7, f: 0.5 },
  { name: 'Pêra',                      kcal: 54,  p: 0.4,  c: 13.5, f: 0.1 },
  { name: 'Goiaba',                    kcal: 54,  p: 2.6,  c: 10.0, f: 0.9 },
  { name: 'Maracujá (polpa)',          kcal: 97,  p: 2.4,  c: 21.2, f: 0.7 },
  // Vegetais e legumes
  { name: 'Alface',                    kcal: 11,  p: 1.3,  c: 1.7,  f: 0.2 },
  { name: 'Tomate',                    kcal: 15,  p: 1.0,  c: 3.1,  f: 0.2 },
  { name: 'Cenoura crua',              kcal: 34,  p: 0.9,  c: 7.7,  f: 0.2 },
  { name: 'Brócolis cozido',           kcal: 35,  p: 3.8,  c: 5.5,  f: 0.4 },
  { name: 'Chuchu cozido',             kcal: 26,  p: 0.8,  c: 5.7,  f: 0.1 },
  { name: 'Abobrinha cozida',          kcal: 20,  p: 1.3,  c: 3.6,  f: 0.3 },
  { name: 'Beterraba cozida',          kcal: 43,  p: 1.8,  c: 8.8,  f: 0.1 },
  { name: 'Espinafre cozido',          kcal: 27,  p: 2.9,  c: 3.5,  f: 0.3 },
  { name: 'Milho cozido',              kcal: 123, p: 4.2,  c: 25.1, f: 1.8 },
  { name: 'Ervilha cozida',            kcal: 69,  p: 5.4,  c: 12.4, f: 0.2 },
  { name: 'Pepino',                    kcal: 13,  p: 0.7,  c: 2.9,  f: 0.1 },
  { name: 'Cebola crua',               kcal: 36,  p: 1.0,  c: 8.6,  f: 0.1 },
  { name: 'Vagem cozida',              kcal: 31,  p: 1.8,  c: 5.9,  f: 0.2 },
  { name: 'Couve refogada',            kcal: 55,  p: 3.3,  c: 5.0,  f: 2.4 },
  // Oleaginosas
  { name: 'Amendoim torrado',          kcal: 581, p: 26.3, c: 21.5, f: 47.5 },
  { name: 'Castanha de caju',          kcal: 570, p: 18.5, c: 29.3, f: 46.3 },
  { name: 'Castanha do Pará (1=5g)',   kcal: 643, p: 14.3, c: 11.7, f: 63.5 },
  { name: 'Amêndoa',                   kcal: 597, p: 21.3, c: 20.4, f: 49.9 },
  { name: 'Pasta de amendoim',         kcal: 589, p: 25.0, c: 19.0, f: 50.4 },
  { name: 'Grão de bico cozido',       kcal: 164, p: 8.9,  c: 27.4, f: 2.6 },
  // Gorduras e óleos
  { name: 'Azeite de oliva',           kcal: 884, p: 0.0,  c: 0.0,  f: 100.0 },
  { name: 'Manteiga',                  kcal: 717, p: 0.9,  c: 0.1,  f: 79.5 },
  // Fast food e processados
  { name: 'Hambúrguer (pão + carne)',  kcal: 295, p: 16.0, c: 28.0, f: 13.0 },
  { name: 'Pizza margherita (fatia)',  kcal: 266, p: 11.4, c: 33.0, f: 9.8 },
  { name: 'Batata frita (fast food)',  kcal: 312, p: 3.4,  c: 41.4, f: 15.5 },
  { name: 'Nuggets de frango',         kcal: 296, p: 16.0, c: 26.0, f: 13.0 },
  { name: 'Biscoito recheado',         kcal: 471, p: 5.0,  c: 71.0, f: 20.0 },
  { name: 'Biscoito cream cracker',    kcal: 438, p: 9.1,  c: 70.6, f: 13.3 },
  { name: 'Pão de queijo',             kcal: 320, p: 6.5,  c: 56.8, f: 8.2 },
  { name: 'Coxinha de frango',         kcal: 232, p: 8.0,  c: 25.0, f: 11.0 },
  { name: 'Esfiha de carne',           kcal: 248, p: 9.0,  c: 30.0, f: 10.5 },
  // Doces e sobremesas
  { name: 'Chocolate ao leite',        kcal: 535, p: 7.7,  c: 59.2, f: 29.7 },
  { name: 'Chocolate amargo 70%',      kcal: 530, p: 9.0,  c: 46.0, f: 37.0 },
  { name: 'Açúcar refinado',           kcal: 387, p: 0.0,  c: 99.9, f: 0.0 },
  { name: 'Mel',                       kcal: 304, p: 0.3,  c: 82.4, f: 0.0 },
  { name: 'Sorvete de creme',          kcal: 207, p: 3.5,  c: 25.6, f: 10.5 },
  { name: 'Brigadeiro (1 un = 15g)',   kcal: 73,  p: 0.9,  c: 10.8, f: 3.2 },
  { name: 'Bolo de chocolate (fatia)', kcal: 371, p: 5.1,  c: 52.0, f: 16.5 },
  // Bebidas (valores por 100ml)
  { name: 'Suco de laranja natural',   kcal: 44,  p: 0.7,  c: 10.5, f: 0.2,  unit: 'ml' },
  { name: 'Suco de uva integral',      kcal: 60,  p: 0.5,  c: 14.5, f: 0.2,  unit: 'ml' },
  { name: 'Refrigerante cola',         kcal: 40,  p: 0.0,  c: 11.2, f: 0.0,  unit: 'ml' },
  { name: 'Cerveja (lata 350ml)',       kcal: 154, p: 1.1,  c: 12.6, f: 0.0,  unit: 'ml' },
  { name: 'Café sem açúcar',           kcal: 2,   p: 0.3,  c: 0.0,  f: 0.0,  unit: 'ml' },
  { name: 'Whey protein (scoop 30g)',  kcal: 109, p: 23.0, c: 3.0,  f: 1.5 },
]

// ── Types ───────────────────────────────────────────────────────────
type FoodLog = {
  id: string
  food_name: string
  portion_g: number
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

// ── TDEE Calculator Modal ───────────────────────────────────────────
function TDEEModal({ onClose, onApply }: { onClose: () => void; onApply: (kcal: number) => void }) {
  const [sex, setSex] = useState<'m' | 'f'>('m')
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [activity, setActivity] = useState('1.55')
  const ACTIVITIES = [
    { val: '1.2',   label: 'Sedentário (sem exercício)' },
    { val: '1.375', label: 'Levemente ativo (1–3x/sem)' },
    { val: '1.55',  label: 'Moderadamente ativo (3–5x/sem)' },
    { val: '1.725', label: 'Muito ativo (6–7x/sem)' },
    { val: '1.9',   label: 'Extremamente ativo (2x/dia)' },
  ]
  const tdee = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age)
    if (!w || !h || !a) return null
    const bmr = sex === 'm'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161
    return Math.round(bmr * parseFloat(activity))
  }, [sex, age, weight, height, activity])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0008', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 360, maxWidth: '90vw' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>🧮 Calculadora de Calorias</h3>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 18 }}>
          Fórmula Mifflin-St Jeor — estimativa do gasto calórico diário (TDEE)
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['m', 'f'] as const).map(s => (
            <button key={s} onClick={() => setSex(s)}
              style={{ flex: 1, padding: '9px', borderRadius: 8, border: `2px solid ${sex === s ? 'var(--accent)' : 'var(--border)'}`,
                background: sex === s ? 'var(--accent)20' : 'var(--bg3)', cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
              {s === 'm' ? '♂ Masculino' : '♀ Feminino'}
            </button>
          ))}
        </div>

        {[
          { label: 'Idade (anos)', val: age, set: setAge, placeholder: 'Ex: 28', type: 'number' },
          { label: 'Peso (kg)',    val: weight, set: setWeight, placeholder: 'Ex: 75', type: 'number' },
          { label: 'Altura (cm)', val: height, set: setHeight, placeholder: 'Ex: 175', type: 'number' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Nível de atividade</label>
          <select value={activity} onChange={e => setActivity(e.target.value)}
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12, outline: 'none' }}>
            {ACTIVITIES.map(a => <option key={a.val} value={a.val}>{a.label}</option>)}
          </select>
        </div>

        {tdee && (
          <div style={{ background: 'var(--accent)15', border: '1px solid var(--accent)40', borderRadius: 10, padding: '14px 16px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Seu TDEE estimado</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-d)' }}>{tdee} kcal/dia</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Para emagrecer: {tdee - 400} kcal &nbsp;|&nbsp; Para ganhar massa: {tdee + 300} kcal</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', cursor: 'pointer', fontSize: 13 }}>
            Cancelar
          </button>
          <button disabled={!tdee} onClick={() => { if (tdee) { onApply(tdee); onClose() } }}
            style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: tdee ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, opacity: tdee ? 1 : 0.5 }}>
            Usar como meta
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Scale Input ─────────────────────────────────────────────────────
function ScaleInput({ label, value, onChange, max = 5, color = 'var(--accent)' }: {
  label: string; value: number | null; onChange: (v: number) => void; max?: number; color?: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{value ?? '—'}/{max}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => onChange(n)}
            style={{ flex: 1, height: 32, borderRadius: 6, border: `2px solid ${(value ?? 0) >= n ? color : 'var(--border)'}`,
              background: (value ?? 0) >= n ? `${color}30` : 'var(--bg3)', cursor: 'pointer',
              color: (value ?? 0) >= n ? color : 'var(--text3)', fontSize: 11, fontWeight: 600 }}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────
export default function SaudePage() {
  const { todayLog, weekLogs, upsertToday, addWater } = useHealth()
  const today = format(new Date(), 'yyyy-MM-dd')

  // ── Health state ──
  const [saving, setSaving] = useState(false)
  const [sleepVal, setSleepVal] = useState('')

  // ── Nutrition state ──
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [calorieGoal, setCalorieGoal] = useState<number>(2000)
  const [showCalc, setShowCalc] = useState(false)
  const [foodSearch, setFoodSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [portion, setPortion] = useState('100')
  const [addingFood, setAddingFood] = useState(false)

  // ── Load calorie goal from localStorage ──
  useEffect(() => {
    const saved = localStorage.getItem('nexus_calorie_goal')
    if (saved) setCalorieGoal(parseInt(saved))
  }, [])

  // ── Load today's food logs ──
  const fetchFoodLogs = useCallback(async () => {
    const res = await fetch(`/api/nutrition?date=${today}`)
    if (res.ok) {
      const json = await res.json()
      setFoodLogs(json.logs ?? [])
    }
  }, [today])

  useEffect(() => { fetchFoodLogs() }, [fetchFoodLogs])

  // ── Derived nutrition totals ──
  const totals = useMemo(() => ({
    kcal: foodLogs.reduce((s, l) => s + Number(l.calories_kcal), 0),
    p:    foodLogs.reduce((s, l) => s + Number(l.protein_g), 0),
    c:    foodLogs.reduce((s, l) => s + Number(l.carbs_g), 0),
    f:    foodLogs.reduce((s, l) => s + Number(l.fat_g), 0),
  }), [foodLogs])

  const pct = Math.min((totals.kcal / calorieGoal) * 100, 100)
  const pctColor = pct >= 100 ? '#ff6b6b' : pct >= 85 ? '#ffd93d' : '#6bcb77'

  // ── Food search filtered list ──
  const filteredFoods = useMemo(() => {
    if (!foodSearch.trim()) return []
    const q = foodSearch.toLowerCase()
    return FOODS.filter(f => f.name.toLowerCase().includes(q)).slice(0, 8)
  }, [foodSearch])

  // ── Preview calories for current selection ──
  const preview = useMemo(() => {
    if (!selectedFood) return null
    const p = parseFloat(portion) || 0
    const mul = p / 100
    return {
      kcal: +(selectedFood.kcal * mul).toFixed(1),
      p:    +(selectedFood.p * mul).toFixed(1),
      c:    +(selectedFood.c * mul).toFixed(1),
      f:    +(selectedFood.f * mul).toFixed(1),
    }
  }, [selectedFood, portion])

  // ── Add food entry ──
  const handleAddFood = async () => {
    if (!selectedFood || !preview) return
    setAddingFood(true)
    const res = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_name: selectedFood.name,
        portion_g: parseFloat(portion),
        calories_kcal: preview.kcal,
        protein_g: preview.p,
        carbs_g: preview.c,
        fat_g: preview.f,
        log_date: today,
      }),
    })
    if (res.ok) {
      const json = await res.json()
      setFoodLogs(prev => [...prev, json.log])
      setSelectedFood(null)
      setFoodSearch('')
      setPortion('100')
    }
    setAddingFood(false)
  }

  // ── Delete food entry ──
  const handleDeleteFood = async (id: string) => {
    const res = await fetch(`/api/nutrition?id=${id}`, { method: 'DELETE' })
    if (res.ok) setFoodLogs(prev => prev.filter(l => l.id !== id))
  }

  // ── Health helpers ──
  const waterGoal = todayLog?.water_goal ?? 2500
  const waterMl = todayLog?.water_ml ?? 0
  const waterPct = Math.min((waterMl / waterGoal) * 100, 100)

  const handleSaveSleep = async () => {
    const h = parseFloat(sleepVal)
    if (!isNaN(h) && h > 0) {
      setSaving(true)
      await upsertToday({ sleep_hours: h })
      setSaving(false)
      setSleepVal('')
    }
  }
  const handleSaveScale = async (field: string, value: number) => {
    await upsertToday({ [field]: value } as Parameters<typeof upsertToday>[0])
  }

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      {showCalc && (
        <TDEEModal
          onClose={() => setShowCalc(false)}
          onApply={kcal => {
            setCalorieGoal(kcal)
            localStorage.setItem('nexus_calorie_goal', String(kcal))
          }}
        />
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Saúde</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Acompanhe seu bem-estar diário</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>

        {/* Água */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>💧 Água</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{waterMl}ml / {waterGoal}ml</div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{Math.round(waterPct)}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 100, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${waterPct}%`, background: '#4A9EE8', borderRadius: 100, transition: 'width .3s' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[150, 250, 350, 500].map(ml => (
              <button key={ml} onClick={() => addWater(ml)}
                style={{ flex: 1, minWidth: 60, padding: '8px 4px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                +{ml}ml
              </button>
            ))}
          </div>
          {waterMl > 0 && (
            <button onClick={() => upsertToday({ water_ml: 0 })}
              style={{ marginTop: 8, width: '100%', padding: '6px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
              Resetar
            </button>
          )}
        </div>

        {/* Sono */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>😴 Sono</div>
            {todayLog?.sleep_hours ? (
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--amber)', marginTop: 8, fontFamily: 'var(--font-d)' }}>
                {todayLog.sleep_hours}h
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Não registrado hoje</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" min={0} max={24} step={0.5} value={sleepVal}
              onChange={e => setSleepVal(e.target.value)}
              placeholder="Horas dormidas"
              style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
            <button onClick={handleSaveSleep} disabled={saving}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
              Salvar
            </button>
          </div>
        </div>

        {/* Humor */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>😊 Humor</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {MOODS.map(m => (
              <button key={m.value} onClick={() => upsertToday({ mood: m.value, mood_label: m.label })}
                title={m.label}
                style={{ flex: 1, padding: '10px 4px', borderRadius: 10, border: `2px solid ${todayLog?.mood === m.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: todayLog?.mood === m.value ? 'var(--accent)20' : 'var(--bg3)', cursor: 'pointer', fontSize: 20, textAlign: 'center' }}>
                {m.value}
              </button>
            ))}
          </div>
          {todayLog?.mood_label && (
            <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 10 }}>{todayLog.mood_label}</div>
          )}
        </div>

        {/* Métricas */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>📊 Métricas</div>
          <ScaleInput label="Energia"   value={todayLog?.energy ?? null}     onChange={v => handleSaveScale('energy', v)}     color="var(--amber)" />
          <ScaleInput label="Estresse"  value={todayLog?.stress ?? null}     onChange={v => handleSaveScale('stress', v)}     color="var(--red)" />
          <ScaleInput label="Motivação" value={todayLog?.motivation ?? null} onChange={v => handleSaveScale('motivation', v)} color="var(--green)" />
        </div>

        {/* ── Nutrição ───────────────────────────────────── */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>🥗 Nutrição</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Acompanhe sua ingestão calórica diária</div>
            </div>
            <button onClick={() => setShowCalc(true)}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              🧮 Calculadora TDEE
            </button>
          </div>

          {/* Calorie progress */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Meta', val: calorieGoal, unit: 'kcal', color: 'var(--text)' },
              { label: 'Consumido', val: Math.round(totals.kcal), unit: 'kcal', color: pctColor },
              { label: 'Restante', val: Math.max(0, Math.round(calorieGoal - totals.kcal)), unit: 'kcal', color: 'var(--text3)' },
            ].map(card => (
              <div key={card.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: card.color, fontFamily: 'var(--font-d)' }}>{card.val.toLocaleString('pt-BR')}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{card.unit}</div>
              </div>
            ))}
            {/* Macros mini cards */}
            {[
              { label: 'Proteína', val: totals.p.toFixed(1), color: '#4d96ff' },
              { label: 'Carboidrato', val: totals.c.toFixed(1), color: '#ffd93d' },
              { label: 'Gordura', val: totals.f.toFixed(1), color: '#ff6b6b' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: m.color, fontFamily: 'var(--font-d)' }}>{m.val}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>g</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
              <span>Progresso calórico</span>
              <span style={{ color: pctColor, fontWeight: 600 }}>{Math.round(pct)}%</span>
            </div>
            <div style={{ height: 10, background: 'var(--bg3)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 100, transition: 'width .4s' }} />
            </div>
            {totals.kcal > calorieGoal && (
              <div style={{ fontSize: 11, color: '#ff6b6b', marginTop: 6 }}>
                ⚠️ Você ultrapassou a meta em {Math.round(totals.kcal - calorieGoal)} kcal
              </div>
            )}
          </div>

          {/* Add food row */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>➕ Adicionar alimento</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '2 1 200px' }}>
                <input
                  value={foodSearch}
                  onChange={e => { setFoodSearch(e.target.value); setShowDropdown(true); if (!e.target.value) setSelectedFood(null) }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar alimento..."
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                {showDropdown && filteredFoods.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 240, overflowY: 'auto', boxShadow: '0 8px 24px #0006' }}>
                    {filteredFoods.map(food => (
                      <div key={food.name} onClick={() => { setSelectedFood(food); setFoodSearch(food.name); setShowDropdown(false) }}
                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span>{food.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{food.kcal} kcal/100{food.unit ?? 'g'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Portion */}
              <div style={{ flex: '1 1 90px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="number" min={1} value={portion} onChange={e => setPortion(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                  placeholder="g / ml" />
                <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{selectedFood?.unit ?? 'g'}</span>
              </div>

              {/* Add button */}
              <button onClick={handleAddFood} disabled={!selectedFood || addingFood}
                style={{ flex: '0 0 auto', padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: selectedFood ? 'pointer' : 'not-allowed', opacity: selectedFood ? 1 : 0.5 }}>
                {addingFood ? '...' : 'Adicionar'}
              </button>
            </div>

            {/* Preview */}
            {preview && selectedFood && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ color: pctColor, fontWeight: 600 }}>🔥 {preview.kcal} kcal</span>
                <span>🥩 Prot: {preview.p}g</span>
                <span>🌾 Carb: {preview.c}g</span>
                <span>🫒 Gord: {preview.f}g</span>
              </div>
            )}
          </div>

          {/* Food log list */}
          {foodLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--text3)' }}>
              Nenhum alimento registrado hoje
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {foodLogs.map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{log.food_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {log.portion_g}g &nbsp;·&nbsp; P:{Number(log.protein_g).toFixed(1)}g &nbsp;·&nbsp; C:{Number(log.carbs_g).toFixed(1)}g &nbsp;·&nbsp; G:{Number(log.fat_g).toFixed(1)}g
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#6bcb77', minWidth: 70, textAlign: 'right' }}>
                    {Number(log.calories_kcal).toFixed(0)} kcal
                  </div>
                  <button onClick={() => handleDeleteFood(log.id)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}
                    title="Remover">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Histórico semanal */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>📅 Últimos 7 dias</div>
          {weekLogs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>Nenhum registro ainda</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Data', 'Água', 'Sono', 'Humor', 'Energia', 'Estresse', 'Motivação'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text3)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: .5, borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekLogs.slice(0, 7).map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '8px 12px', color: 'var(--text3)' }}>{new Date(log.log_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                      <td style={{ padding: '8px 12px' }}>{log.water_ml ? `${log.water_ml}ml` : '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{log.sleep_hours ? `${log.sleep_hours}h` : '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{log.mood || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--amber)' }}>{log.energy ?? '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--red)' }}>{log.stress ?? '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--green)' }}>{log.motivation ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
