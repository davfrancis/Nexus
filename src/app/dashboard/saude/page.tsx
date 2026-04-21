'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useHealth } from '@/hooks/useHealth'
import { FitnessGoals } from '@/components/FitnessGoals'
import ModalPortal from '@/components/ModalPortal'
import { NutritionHistory } from '@/components/NutritionHistory'
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
  // Novos Grãos e Cereais
  { name: 'Quinoa cozida',              kcal: 120, p: 4.4,  c: 21.3, f: 1.9 },
  { name: 'Cuscuz paulista',            kcal: 180, p: 3.5,  c: 30.0, f: 5.0 },
  { name: 'Macarrão integral cozido',   kcal: 124, p: 5.3,  c: 26.5, f: 0.5 },
  // Novas Proteínas
  { name: 'Patinho moído grelhado',     kcal: 219, p: 35.9, c: 0.0,  f: 7.3 },
  { name: 'Peito de peru defumado',     kcal: 104, p: 20.0, c: 2.0,  f: 1.8 },
  { name: 'Isca de carne bovina (alcatra)', kcal: 208, p: 30.0, c: 0.0,  f: 9.6 },
  // Novos Laticínios
  { name: 'Queijo Minas frescal',       kcal: 243, p: 15.0, c: 3.0,  f: 19.0 },
  { name: 'Ricota',                     kcal: 138, p: 11.4, c: 5.1,  f: 7.9 },
  { name: 'Leite de amêndoas',          kcal: 15,  p: 0.4,  c: 0.1,  f: 1.2, unit: 'ml' },
  // Novas Frutas
  { name: 'Maçã verde',                 kcal: 52,  p: 0.3,  c: 13.8, f: 0.2 },
  { name: 'Melão',                      kcal: 34,  p: 0.8,  c: 8.2,  f: 0.2 },
  { name: 'Ameixa fresca',              kcal: 46,  p: 0.7,  c: 11.4, f: 0.3 },
  { name: 'Pêssego',                    kcal: 39,  p: 0.9,  c: 9.5,  f: 0.3 },
  { name: 'Mirtilo (Blueberry)',        kcal: 57,  p: 0.7,  c: 14.5, f: 0.3 },
  // Novos Vegetais
  { name: 'Couve-flor cozida',          kcal: 23,  p: 1.8,  c: 4.1,  f: 0.5 },
  { name: 'Repolho',                    kcal: 25,  p: 1.3,  c: 5.8,  f: 0.1 },
  { name: 'Berinjela cozida',           kcal: 35,  p: 0.8,  c: 8.7,  f: 0.2 },
  { name: 'Rúcula',                     kcal: 25,  p: 2.6,  c: 3.7,  f: 0.7 },
  { name: 'Pimentão',                   kcal: 20,  p: 0.9,  c: 4.6,  f: 0.2 },
]

// ── Receitas Fit ────────────────────────────────────────────────────
type Meal = 'breakfast' | 'lunch' | 'snack' | 'dinner'
type Recipe = {
  id: string; name: string; meal: Meal; time: number
  kcal: number; protein: number; carbs: number; fat: number
  tags: string[]; emoji: string
  ingredients: { qty: string; item: string }[]
  steps: string[]; tip?: string
}

const MEAL_LABELS: Record<Meal, { label: string; icon: string; color: string }> = {
  breakfast: { label: 'Café da Manhã', icon: '🌅', color: '#ff9500' },
  lunch:     { label: 'Almoço',        icon: '☀️',  color: '#4d96ff' },
  snack:     { label: 'Café da Tarde', icon: '🍎',  color: '#6bcb77' },
  dinner:    { label: 'Jantar',        icon: '🌙',  color: '#a78bfa' },
}

const RECIPES: Recipe[] = [
  // ── Café da Manhã ──
  {
    id: 'r1', name: 'Panqueca de Aveia com Banana', meal: 'breakfast', time: 10, emoji: '🥞',
    kcal: 320, protein: 20, carbs: 42, fat: 7,
    tags: ['Sem glúten', 'Rápido', 'Alto proteína'],
    ingredients: [
      { qty: '3', item: 'ovos inteiros' },
      { qty: '1 banana madura', item: '(amassada)' },
      { qty: '4 col. sopa', item: 'aveia em flocos finos' },
      { qty: '1 pitada', item: 'sal e canela' },
      { qty: '½ col. chá', item: 'fermento em pó (opcional)' },
    ],
    steps: [
      'Amasse a banana com um garfo até virar purê.',
      'Misture a banana amassada com os ovos, aveia, sal e canela. Bata com um garfo até incorporar bem.',
      'Aqueça uma frigideira antiaderente em fogo médio com um fio de azeite ou spray de óleo.',
      'Despeje 2-3 col. sopa da massa por panqueca. Cozinhe por 2-3 min até aparecerem bolhinhas.',
      'Vire com cuidado e cozinhe mais 1-2 min.',
      'Sirva com mel, frutas frescas ou pasta de amendoim.',
    ],
    tip: 'Use banana bem madura para adoçar naturalmente e dispensar açúcar.',
  },
  {
    id: 'r2', name: 'Omelete Fit Proteico', meal: 'breakfast', time: 8, emoji: '🍳',
    kcal: 280, protein: 28, carbs: 5, fat: 16,
    tags: ['Low carb', 'Rápido', 'Alto proteína'],
    ingredients: [
      { qty: '3', item: 'ovos inteiros' },
      { qty: '50g', item: 'queijo cottage' },
      { qty: '2 fatias', item: 'presunto magro picado' },
      { qty: '½ und', item: 'tomate picado' },
      { qty: 'A gosto', item: 'sal, pimenta e orégano' },
    ],
    steps: [
      'Bata os ovos com sal e pimenta em um bowl.',
      'Aqueça a frigideira antiaderente em fogo médio com spray de óleo.',
      'Despeje os ovos batidos e deixe firmar levemente nas bordas.',
      'Adicione o cottage, presunto e tomate sobre metade do omelete.',
      'Dobre o omelete ao meio, cubra e cozinhe por 1 min.',
      'Sirva imediatamente com orégano por cima.',
    ],
    tip: 'Substitua o presunto por frango desfiado para ainda mais proteína.',
  },
  {
    id: 'r3', name: 'Vitamina Proteica de Banana', meal: 'breakfast', time: 5, emoji: '🥤',
    kcal: 350, protein: 30, carbs: 40, fat: 6,
    tags: ['Sem cozinhar', 'Rápido', 'Alto proteína'],
    ingredients: [
      { qty: '1 banana', item: 'congelada ou fresca' },
      { qty: '300ml', item: 'leite desnatado ou vegetal' },
      { qty: '1 scoop (30g)', item: 'whey protein baunilha' },
      { qty: '1 col. sopa', item: 'aveia em flocos' },
      { qty: '1 col. chá', item: 'pasta de amendoim' },
      { qty: '1 pitada', item: 'canela' },
    ],
    steps: [
      'Coloque o leite no liquidificador primeiro (facilita bater).',
      'Adicione a banana, o whey, a aveia e a pasta de amendoim.',
      'Bata por 30-60 segundos até ficar cremoso.',
      'Sirva imediatamente. Se quiser mais espesso, adicione gelo.',
    ],
    tip: 'Congele bananas maduras em porções para sempre ter disponível. Substitua o whey por iogurte grego para versão sem suplemento.',
  },
  {
    id: 'r4', name: 'Tapioca com Frango e Cottage', meal: 'breakfast', time: 12, emoji: '🫓',
    kcal: 290, protein: 32, carbs: 30, fat: 5,
    tags: ['Sem glúten', 'Alto proteína', 'Leve'],
    ingredients: [
      { qty: '4 col. sopa (50g)', item: 'goma de tapioca hidratada' },
      { qty: '80g', item: 'frango desfiado temperado' },
      { qty: '3 col. sopa', item: 'queijo cottage' },
      { qty: 'A gosto', item: 'sal e ervas (salsinha, cebolinha)' },
    ],
    steps: [
      'Tempere o frango desfiado com sal, limão e ervas.',
      'Aqueça uma frigideira antiaderente em fogo médio.',
      'Espalhe a goma de tapioca formando um círculo fino.',
      'Espere firmar (1-2 min) até a borda soltar da frigideira.',
      'Vire com cuidado e aqueça o outro lado por 30 seg.',
      'Coloque o frango e o cottage no centro e dobre ao meio.',
      'Sirva com salsa e cebolinha por cima.',
    ],
    tip: 'Prepare o frango desfiado em maior quantidade e congele em porções — facilita a semana toda.',
  },
  // ── Almoço ──
  {
    id: 'r5', name: 'Frango Grelhado com Arroz Integral', meal: 'lunch', time: 25, emoji: '🍗',
    kcal: 480, protein: 45, carbs: 48, fat: 9,
    tags: ['Clássico', 'Alto proteína', 'Completo'],
    ingredients: [
      { qty: '200g', item: 'peito de frango' },
      { qty: '80g cru', item: 'arroz integral' },
      { qty: '150g', item: 'brócolis cozido no vapor' },
      { qty: '1 dente', item: 'alho' },
      { qty: '1 fio', item: 'azeite de oliva' },
      { qty: 'A gosto', item: 'sal, pimenta, limão e ervas' },
    ],
    steps: [
      'Tempere o frango com sal, pimenta, alho amassado, suco de limão e ervas. Deixe marinar 10 min.',
      'Inicie o arroz integral: refogue alho no azeite, adicione o arroz, agua (proporção 1:2) e cozinhe tampado em fogo baixo por 20 min.',
      'Grelhe o frango em frigideira quente com fio de azeite por 5-6 min de cada lado até dourar.',
      'Enquanto isso, cozinhe o brócolis no vapor por 5 min (deve ficar al dente).',
      'Monte o prato: arroz na base, frango fatiado e brócolis ao lado.',
      'Regue com limão e azeite. Tempere com sal a gosto.',
    ],
    tip: 'Cozinhe arroz integral em dobro e congele em porções — economiza 20 min no dia seguinte.',
  },
  {
    id: 'r6', name: 'Bowl de Atum com Legumes', meal: 'lunch', time: 15, emoji: '🥗',
    kcal: 380, protein: 38, carbs: 32, fat: 10,
    tags: ['Sem cozinhar', 'Rápido', 'Low carb'],
    ingredients: [
      { qty: '2 latas (170g)', item: 'atum em água escorrido' },
      { qty: '100g', item: 'arroz integral cozido' },
      { qty: '1 und', item: 'tomate picado' },
      { qty: '½ und', item: 'pepino picado' },
      { qty: '2 col. sopa', item: 'milho' },
      { qty: '1 col. chá', item: 'azeite, limão e sal' },
    ],
    steps: [
      'Escorra bem o atum e transfira para um bowl.',
      'Adicione o arroz já cozido e levemente aquecido.',
      'Pique o tomate e pepino em cubos médios.',
      'Misture tudo no bowl: atum, arroz, tomate, pepino e milho.',
      'Tempere com azeite, suco de limão, sal e pimenta.',
      'Misture bem e sirva imediatamente.',
    ],
    tip: 'Adicione abacate fatiado para gorduras boas e aumentar a saciedade.',
  },
  {
    id: 'r7', name: 'Tilápia Assada com Batata Doce', meal: 'lunch', time: 30, emoji: '🐟',
    kcal: 420, protein: 42, carbs: 40, fat: 8,
    tags: ['Assado', 'Fácil', 'Anti-inflamatório'],
    ingredients: [
      { qty: '200g', item: 'filé de tilápia' },
      { qty: '150g', item: 'batata doce em cubos' },
      { qty: '1 und', item: 'limão (suco e raspas)' },
      { qty: '2 dentes', item: 'alho' },
      { qty: '1 col. sopa', item: 'azeite de oliva' },
      { qty: 'A gosto', item: 'sal, pimenta, páprica e tomilho' },
    ],
    steps: [
      'Pré-aqueça o forno a 200°C.',
      'Corte a batata doce em cubos de 2cm, tempere com azeite, sal e páprica.',
      'Coloque os cubos numa forma e asse por 15 min.',
      'Tempere a tilápia com sal, pimenta, alho amassado, raspas e suco de limão.',
      'Adicione a tilápia na forma ao lado da batata doce já semi-assada.',
      'Regue tudo com azeite e asse por mais 15 min até o peixe desaparecer a transparência.',
      'Sirva com salsa picada por cima.',
    ],
    tip: 'Cozinhar tudo na mesma forma minimiza a louça e concentra os sabores.',
  },
  {
    id: 'r8', name: 'Macarrão com Molho Proteico', meal: 'lunch', time: 20, emoji: '🍝',
    kcal: 510, protein: 40, carbs: 55, fat: 11,
    tags: ['Comfort food', 'Alto proteína', 'Fácil'],
    ingredients: [
      { qty: '80g cru', item: 'macarrão integral (penne ou espaguete)' },
      { qty: '150g', item: 'carne moída patinho (90% magra)' },
      { qty: '1 lata', item: 'tomate pelado ou molho de tomate sem açúcar' },
      { qty: '1 und', item: 'tomate fresco picado' },
      { qty: '2 dentes', item: 'alho' },
      { qty: 'A gosto', item: 'sal, orégano, manjericão e pimenta' },
    ],
    steps: [
      'Cozinhe o macarrão al dente conforme embalagem. Reserve.',
      'Em uma frigideira, doure o alho em fio de azeite.',
      'Adicione a carne moída e refogue mexendo sempre até secar a água.',
      'Tempere com sal, pimenta e orégano.',
      'Adicione o tomate fresco e o molho. Cozinhe em fogo médio por 8 min.',
      'Misture o macarrão ao molho, ajuste o sal e sirva com manjericão.',
    ],
    tip: 'Use carne moída de patinho ou acém — menos gordura que fraldinha ou cupim.',
  },
  // ── Café da Tarde ──
  {
    id: 'r9', name: 'Iogurte Grego com Frutas e Granola', meal: 'snack', time: 3, emoji: '🫙',
    kcal: 220, protein: 15, carbs: 28, fat: 6,
    tags: ['Sem cozinhar', 'Rápido', 'Probiótico'],
    ingredients: [
      { qty: '150g', item: 'iogurte grego natural (sem açúcar)' },
      { qty: '2 col. sopa', item: 'granola sem açúcar' },
      { qty: '½ xíc', item: 'frutas frescas (morango, manga, banana)' },
      { qty: '1 col. chá', item: 'mel (opcional)' },
      { qty: '1 pitada', item: 'canela' },
    ],
    steps: [
      'Coloque o iogurte grego numa tigela.',
      'Adicione as frutas frescas picadas por cima.',
      'Polvilhe a granola (coloque por último para manter crocante).',
      'Regue com mel e canela a gosto.',
    ],
    tip: 'Monte apenas na hora de comer para a granola não amolecer. Prefira iogurte grego com ≥10g proteína/100g.',
  },
  {
    id: 'r10', name: 'Vitamina de Banana com Aveia', meal: 'snack', time: 5, emoji: '🧉',
    kcal: 260, protein: 12, carbs: 42, fat: 5,
    tags: ['Sem cozinhar', 'Rápido', 'Energético'],
    ingredients: [
      { qty: '1', item: 'banana média' },
      { qty: '250ml', item: 'leite desnatado' },
      { qty: '2 col. sopa', item: 'aveia em flocos' },
      { qty: '1 col. chá', item: 'mel ou tâmara' },
      { qty: '1 pitada', item: 'canela e noz-moscada' },
    ],
    steps: [
      'Coloque o leite no liquidificador.',
      'Adicione a banana cortada, aveia, mel e especiarias.',
      'Bata por 30 segundos até homogêneo.',
      'Sirva com gelo se preferir gelado.',
    ],
    tip: 'Consuma até 1h antes do treino — fornece energia de liberação rápida e moderada.',
  },
  {
    id: 'r11', name: 'Mix de Castanhas com Fruta', meal: 'snack', time: 2, emoji: '🥜',
    kcal: 200, protein: 6, carbs: 18, fat: 13,
    tags: ['Sem cozinhar', 'Anti-inflamatório', 'Prático'],
    ingredients: [
      { qty: '30g', item: 'mix de castanhas (caju, amêndoa, nozes)' },
      { qty: '1 und', item: 'maçã ou pera' },
      { qty: '1 und', item: 'castanha do Pará' },
    ],
    steps: [
      'Separe 30g de castanhas variadas numa tigela ou pote.',
      'Lave e corte a fruta.',
      'Consuma juntos — a fibra da fruta + gordura das castanhas = saciedade prolongada.',
    ],
    tip: 'Pré-porcione as castanhas em potinhos semanais para não exagerar na quantidade.',
  },
  {
    id: 'r12', name: 'Torrada Integral com Ovo', meal: 'snack', time: 8, emoji: '🍞',
    kcal: 240, protein: 16, carbs: 22, fat: 10,
    tags: ['Rápido', 'Saciante', 'Fácil'],
    ingredients: [
      { qty: '2 fatias', item: 'pão de forma integral' },
      { qty: '2', item: 'ovos' },
      { qty: '½ und', item: 'tomate fatiado' },
      { qty: 'A gosto', item: 'sal, pimenta e orégano' },
    ],
    steps: [
      'Torre as fatias de pão.',
      'Frite os ovos no estilo desejado (mexido, cozido ou escalfado) com sal e pimenta.',
      'Monte: torrada + ovo + tomate fatiado.',
      'Finalize com orégano e pimenta preta.',
    ],
    tip: 'Adicione abacate amassado na torrada para uma opção ainda mais nutritiva e saborosa.',
  },
  // ── Jantar ──
  {
    id: 'r13', name: 'Frango Assado com Legumes', meal: 'dinner', time: 35, emoji: '🍽️',
    kcal: 370, protein: 42, carbs: 20, fat: 10,
    tags: ['Low carb', 'Assado', 'Completo'],
    ingredients: [
      { qty: '200g', item: 'coxa ou peito de frango' },
      { qty: '1 und', item: 'abobrinha fatiada' },
      { qty: '1 und', item: 'cenoura cortada em palitos' },
      { qty: '100g', item: 'brócolis' },
      { qty: '1 col. sopa', item: 'azeite de oliva' },
      { qty: 'A gosto', item: 'alho, sal, pimenta, páprica defumada e limão' },
    ],
    steps: [
      'Pré-aqueça o forno a 200°C.',
      'Marine o frango: alho amassado, limão, azeite, sal, pimenta e páprica. Deixe 15 min.',
      'Corte os legumes em tamanhos similares para assar uniformemente.',
      'Coloque tudo numa assadeira, o frango no centro e legumes ao redor.',
      'Asse por 30-35 min, virando o frango na metade do tempo.',
      'O frango está pronto quando atingir 75°C interno (ou ao cortar, não houver cor rosada).',
    ],
    tip: 'Jantar leve em carboidratos e rico em proteína favorece a recuperação muscular e o sono.',
  },
  {
    id: 'r14', name: 'Omelete de Claras com Legumes', meal: 'dinner', time: 10, emoji: '🥚',
    kcal: 220, protein: 26, carbs: 8, fat: 9,
    tags: ['Low carb', 'Rápido', 'Leve'],
    ingredients: [
      { qty: '4', item: 'claras de ovo' },
      { qty: '1', item: 'ovo inteiro' },
      { qty: '½ und', item: 'pimentão picado' },
      { qty: '1 und', item: 'tomate picado' },
      { qty: '30g', item: 'queijo cottage ou mussarela light' },
      { qty: 'A gosto', item: 'sal, pimenta, cúrcuma e salsinha' },
    ],
    steps: [
      'Bata as claras com o ovo inteiro, sal, pimenta e cúrcuma.',
      'Refogue o pimentão por 2 min em frigideira antiaderente com spray de óleo.',
      'Adicione o tomate picado e mexa por 1 min.',
      'Despeje a mistura de ovos sobre os legumes.',
      'Tampe e cozinhe em fogo baixo por 3-4 min até firmar.',
      'Adicione o queijo e dobre. Sirva com salsinha.',
    ],
    tip: 'Usar mais claras e menos gemas reduz calorias e gordura sem perder proteína.',
  },
  {
    id: 'r15', name: 'Salada Proteica de Atum', meal: 'dinner', time: 10, emoji: '🥙',
    kcal: 280, protein: 32, carbs: 15, fat: 9,
    tags: ['Sem cozinhar', 'Low carb', 'Leve'],
    ingredients: [
      { qty: '2 latas (170g)', item: 'atum em água' },
      { qty: '2 xíc', item: 'folhas mistas (alface, rúcula, espinafre)' },
      { qty: '1 und', item: 'tomate cereja cortado ao meio' },
      { qty: '½ und', item: 'pepino fatiado' },
      { qty: '1 und', item: 'ovo cozido fatiado' },
      { qty: 'Molho', item: '1 limão + 1 col. azeite + sal + mostarda' },
    ],
    steps: [
      'Cozinhe o ovo (8 min água fervente) e fatie.',
      'Lave e seque bem as folhas.',
      'Monte a base de folhas na tigela.',
      'Adicione o atum escorrido, tomate, pepino e ovo.',
      'Prepare o molho: misture suco de limão, azeite, mostarda e sal.',
      'Regue com o molho na hora de servir.',
    ],
    tip: 'Jante cedo (2h antes de dormir) para melhor digestão e qualidade do sono.',
  },
  {
    id: 'r16', name: 'Sopa de Legumes com Frango', meal: 'dinner', time: 30, emoji: '🍲',
    kcal: 310, protein: 35, carbs: 22, fat: 6,
    tags: ['Reconfortante', 'Anti-inflamatório', 'Fácil'],
    ingredients: [
      { qty: '150g', item: 'frango cozido e desfiado' },
      { qty: '1 und', item: 'cenoura em cubos pequenos' },
      { qty: '1 talo', item: 'aipo picado' },
      { qty: '½ und', item: 'chuchu em cubos' },
      { qty: '1 litro', item: 'caldo de frango caseiro ou water' },
      { qty: 'A gosto', item: 'sal, alho, cúrcuma, pimenta e salsinha' },
    ],
    steps: [
      'Em panela, doure alho amassado em fio de azeite.',
      'Adicione a cenoura, aipo e chuchu. Refogue por 3 min.',
      'Junte o caldo (ou água com 1 cubo de caldo sem gordura) e tempere.',
      'Cozinhe em fogo médio por 15 min até os legumes ficarem macios.',
      'Adicione o frango desfiado e cúrcuma. Cozinhe por mais 5 min.',
      'Ajuste o sal e sirva com salsinha fresca.',
    ],
    tip: 'Sopa é excelente para o jantar: hidratante, reconfortante e de baixa caloria relativa ao volume.',
  },
  {
    id: 'r17', name: 'Crepioca Fit de Queijo', meal: 'breakfast', time: 5, emoji: '🌮',
    kcal: 210, protein: 12, carbs: 15, fat: 11,
    tags: ['Sem glúten', 'Rápido', 'Prático'],
    ingredients: [
      { qty: '1', item: 'ovo inteiro' },
      { qty: '1 col. sopa', item: 'goma de tapioca' },
      { qty: '1 col. sopa', item: 'requeijão light ou cottage' },
      { qty: '1 fatia', item: 'queijo mussarela' },
      { qty: '1 pitada', item: 'sal e orégano' },
    ],
    steps: [
      'Bata o ovo com a goma de tapioca, sal e requeijão até ficar homogêneo.',
      'Despeje a mistura em uma frigideira antiaderente levemente untada e aquecida.',
      'Deixe dourar de um lado, vire e coloque a fatia de queijo.',
      'Dobre ao meio e espere o queijo derreter. Sirva quentinho.',
    ],
    tip: 'Adicione sementes de chia na massa para aumentar a quantidade de fibras.',
  },
  {
    id: 'r18', name: 'Mingau de Aveia Proteico', meal: 'breakfast', time: 10, emoji: '🥣',
    kcal: 310, protein: 22, carbs: 40, fat: 7,
    tags: ['Comfort food', 'Saciante', 'Fibras'],
    ingredients: [
      { qty: '3 col. sopa', item: 'aveia em flocos' },
      { qty: '200ml', item: 'leite desnatado ou de amêndoas' },
      { qty: '1 scoop', item: 'whey protein (baunilha ou chocolate)' },
      { qty: '1/2', item: 'banana picada' },
      { qty: 'A gosto', item: 'canela em pó' },
    ],
    steps: [
      'Em uma panela, misture a aveia e o leite.',
      'Cozinhe em fogo baixo mexendo sempre até engrossar (cerca de 5 min).',
      'Desligue o fogo e misture o whey protein rapidamente para não empelotar.',
      'Sirva em um bowl, decore com a banana picada e polvilhe canela.',
    ],
    tip: 'Se não tiver whey, misture 2 claras de ovo durante o cozimento mexendo rápido, ou adicione iogurte grego no final.',
  },
  {
    id: 'r19', name: 'Escondidinho Fit de Batata Doce', meal: 'lunch', time: 40, emoji: '🥧',
    kcal: 420, protein: 35, carbs: 45, fat: 12,
    tags: ['Assado', 'Completo', 'Marmita'],
    ingredients: [
      { qty: '150g', item: 'batata doce cozida e amassada' },
      { qty: '150g', item: 'frango desfiado temperado' },
      { qty: '2 col. sopa', item: 'leite (para o purê)' },
      { qty: '1 col. sopa', item: 'requeijão light' },
      { qty: '1 fatia', item: 'queijo mussarela' },
    ],
    steps: [
      'Misture a batata doce amassada com o leite e requeijão para fazer o purê. Tempere com sal.',
      'Em um refratário pequeno, coloque metade do purê no fundo.',
      'Adicione a camada de frango desfiado.',
      'Cubra com o restante do purê e coloque a fatia de queijo por cima.',
      'Leve ao forno pré-aquecido ou airfryer por 10-15 min para gratinar.',
    ],
    tip: 'Ótima opção para congelar. Você pode fazer várias marmitas para a semana.',
  },
  {
    id: 'r20', name: 'Sanduíche Natural de Atum', meal: 'snack', time: 5, emoji: '🥪',
    kcal: 260, protein: 18, carbs: 24, fat: 10,
    tags: ['Sem cozinhar', 'Rápido', 'Prático'],
    ingredients: [
      { qty: '2 fatias', item: 'pão de forma integral' },
      { qty: '3 col. sopa', item: 'atum em água escorrido' },
      { qty: '1 col. sopa', item: 'maionese light ou iogurte natural' },
      { qty: '1 col. sopa', item: 'cenoura ralada' },
      { qty: '2 folhas', item: 'alface' },
    ],
    steps: [
      'Em um potinho, misture o atum, a maionese/iogurte e a cenoura ralada.',
      'Tempere a pasta com um pouco de sal, pimenta e limão se desejar.',
      'Espalhe a pasta em uma fatia de pão, adicione a alface e feche com a outra fatia.',
      'Corte ao meio e sirva.',
    ],
    tip: 'Embrulhe no papel alumínio para levar como lanche para o trabalho.',
  },
  {
    id: 'r21', name: 'Pizza com Massa de Rap10 (Wrap)', meal: 'dinner', time: 10, emoji: '🍕',
    kcal: 290, protein: 20, carbs: 25, fat: 12,
    tags: ['Rápido', 'Comfort food', 'Fácil'],
    ingredients: [
      { qty: '1 disco', item: 'massa de wrap integral (tipo Rap10)' },
      { qty: '2 col. sopa', item: 'molho de tomate natural' },
      { qty: '50g', item: 'queijo mussarela light ralado' },
      { qty: '3 fatias', item: 'peito de peru ou tomate cereja' },
      { qty: 'A gosto', item: 'orégano e manjericão' },
    ],
    steps: [
      'Coloque o disco de massa em uma frigideira antiaderente para tostar levemente um lado.',
      'Vire a massa, desligue o fogo um instante.',
      'Espalhe o molho de tomate, o queijo e o peito de peru (ou tomate).',
      'Ligue em fogo baixo, tampe a frigideira e aguarde 2-3 min até o queijo derreter.',
      'Finalize com orégano e manjericão.',
    ],
    tip: 'A massa de wrap fica super crocante na frigideira, matando a vontade de pizza de forma rápida e leve.',
  },
]

function ReceitasSection({ onAddToNutrition }: { onAddToNutrition?: (r: Recipe) => Promise<void> }) {
  const [mealFilter, setMealFilter] = useState<Meal | 'all'>('all')
  const [selected, setSelected]     = useState<Recipe | null>(null)
  const [adding, setAdding]         = useState(false)
  const [added, setAdded]           = useState(false)

  const filtered = mealFilter === 'all' ? RECIPES : RECIPES.filter(r => r.meal === mealFilter)

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>🍽️ Receitas Fit</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Refeições saudáveis com passo a passo</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setMealFilter('all')}
            style={{ padding: '5px 12px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: mealFilter === 'all' ? 'var(--accent)' : 'var(--bg3)',
              color: mealFilter === 'all' ? '#fff' : 'var(--text3)' }}>
            Todas
          </button>
          {(Object.entries(MEAL_LABELS) as [Meal, typeof MEAL_LABELS[Meal]][]).map(([key, m]) => (
            <button key={key} onClick={() => setMealFilter(key)}
              style={{ padding: '5px 12px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: mealFilter === key ? m.color : 'var(--bg3)',
                color: mealFilter === key ? '#fff' : 'var(--text3)' }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {filtered.map(r => {
          const ml = MEAL_LABELS[r.meal]
          return (
            <div key={r.id} onClick={() => setSelected(r)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, cursor: 'pointer',
                transition: 'border-color .15s, transform .1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{r.emoji}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: ml.color + '20', color: ml.color, fontWeight: 600 }}>
                  {ml.icon} {ml.label}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{r.name}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>⏱ {r.time} min</span>
                <span style={{ fontSize: 10, color: '#ff9500', fontWeight: 600 }}>{r.kcal} kcal</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <div style={{ flex: 1, background: 'var(--bg2)', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>PROT</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4d96ff' }}>{r.protein}g</div>
                </div>
                <div style={{ flex: 1, background: 'var(--bg2)', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>CARB</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ff9500' }}>{r.carbs}g</div>
                </div>
                <div style={{ flex: 1, background: 'var(--bg2)', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>GORD</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6bcb77' }}>{r.fat}g</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {r.tags.slice(0, 2).map(t => (
                  <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: 'var(--bg2)', color: 'var(--text3)' }}>{t}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recipe Detail Modal */}
      {selected && (
        <ModalPortal onClose={() => setSelected(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 560, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 32, marginBottom: 6 }}>{selected.emoji}</div>
                <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{selected.name}</h2>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: MEAL_LABELS[selected.meal].color, fontWeight: 600 }}>
                    {MEAL_LABELS[selected.meal].icon} {MEAL_LABELS[selected.meal].label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>⏱ {selected.time} min</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>

            {/* Macros */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Calorias', val: `${selected.kcal}`, unit: 'kcal', color: '#ff9500' },
                { label: 'Proteína', val: `${selected.protein}`, unit: 'g', color: '#4d96ff' },
                { label: 'Carbs',    val: `${selected.carbs}`,  unit: 'g', color: '#ffd93d' },
                { label: 'Gordura', val: `${selected.fat}`,    unit: 'g', color: '#6bcb77' },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: 'var(--font-d)' }}>{m.val}</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>{m.unit}</div>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {selected.tags.map(t => (
                <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'var(--accent)20', color: 'var(--accent2)', fontWeight: 600 }}>{t}</span>
              ))}
            </div>

            {/* Ingredients */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text3)', marginBottom: 10 }}>Ingredientes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.ingredients.map((ing, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 13 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 90, fontSize: 12 }}>{ing.qty}</span>
                    <span style={{ color: 'var(--text)' }}>{ing.item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div style={{ marginBottom: selected.tip ? 16 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text3)', marginBottom: 10 }}>Modo de Preparo</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selected.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tip */}
            {selected.tip && (
              <div style={{ marginTop: 16, background: '#ffd93d15', border: '1px solid #ffd93d30', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd93d', marginBottom: 4 }}>💡 DICA FIT</div>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{selected.tip}</div>
              </div>
            )}

            {/* Add to Nutrition */}
            {onAddToNutrition && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button
                  disabled={adding || added}
                  onClick={async () => {
                    setAdding(true)
                    await onAddToNutrition(selected)
                    setAdding(false)
                    setAdded(true)
                    setTimeout(() => setAdded(false), 3000)
                  }}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: adding || added ? 'default' : 'pointer',
                    background: added ? '#6bcb7730' : 'var(--accent)', color: added ? '#6bcb77' : '#fff',
                    fontSize: 14, fontWeight: 700, transition: 'background .2s',
                  }}>
                  {added ? '✅ Adicionado à Nutrição!' : adding ? 'Adicionando…' : `🍽️ Adicionar refeição à Nutrição (+${selected.kcal} kcal)`}
                </button>
                <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 6 }}>
                  Registra {selected.protein}g prot · {selected.carbs}g carb · {selected.fat}g gord no log de hoje
                </div>
              </div>
            )}
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

// ── Lista de Compras ────────────────────────────────────────────────
const DEFAULT_SHOPPING_LIST = [
  { id: 'sl1', category: 'Proteínas', item: 'Ovos', checked: false },
  { id: 'sl2', category: 'Proteínas', item: 'Peito de frango', checked: false },
  { id: 'sl3', category: 'Proteínas', item: 'Patinho moído', checked: false },
  { id: 'sl4', category: 'Proteínas', item: 'Atum ou Sardinha em lata', checked: false },
  { id: 'sl5', category: 'Carboidratos', item: 'Aveia em flocos', checked: false },
  { id: 'sl6', category: 'Carboidratos', item: 'Arroz (branco ou integral)', checked: false },
  { id: 'sl7', category: 'Carboidratos', item: 'Batata (inglesa e doce)', checked: false },
  { id: 'sl8', category: 'Carboidratos', item: 'Macarrão / Tapioca', checked: false },
  { id: 'sl9', category: 'Hortifruti', item: 'Bananas', checked: false },
  { id: 'sl10', category: 'Hortifruti', item: 'Limão, Cebola, Alho', checked: false },
  { id: 'sl11', category: 'Hortifruti', item: 'Folhas (Alface, Rúcula)', checked: false },
  { id: 'sl12', category: 'Hortifruti', item: 'Tomate', checked: false },
  { id: 'sl13', category: 'Laticínios & Outros', item: 'Queijo (Mussarela / Minas)', checked: false },
  { id: 'sl14', category: 'Laticínios & Outros', item: 'Leite', checked: false },
  { id: 'sl15', category: 'Laticínios & Outros', item: 'Iogurte Natural', checked: false },
  { id: 'sl16', category: 'Laticínios & Outros', item: 'Azeite de Oliva', checked: false },
]

function ShoppingListSection() {
  const [items, setItems] = useState(DEFAULT_SHOPPING_LIST)
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('Outros')

  useEffect(() => {
    const saved = localStorage.getItem('nexus_health_shopping_list')
    if (saved) setItems(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('nexus_health_shopping_list', JSON.stringify(items))
  }, [items])

  const toggleItem = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const resetList = () => setItems(prev => prev.map(i => ({ ...i, checked: false })))
  
  const handleAdd = () => {
    if (!newItem.trim()) return
    setItems(prev => [...prev, { id: 'sl_' + Date.now(), category: newCategory, item: newItem.trim(), checked: false }])
    setNewItem('')
  }

  const categories = Array.from(new Set(items.map(i => i.category)))

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>🛒 Lista de Compras Base</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Ingredientes essenciais para facilitar o preparo das refeições</div>
        </div>
        <button onClick={resetList} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
          Desmarcar Tudo
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Adicionar novo item..." 
          style={{ flex: '1 1 150px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} 
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
          {Array.from(new Set([...categories, 'Proteínas', 'Carboidratos', 'Hortifruti', 'Laticínios & Outros', 'Outros'])).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={handleAdd} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Adicionar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {categories.map(cat => (
          <div key={cat} style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>{cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.filter(i => i.category === cat).map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div onClick={() => toggleItem(item.id)}
                    style={{ width: 18, height: 18, borderRadius: 6, border: \`2px solid \${item.checked ? 'var(--accent)' : 'var(--border)'}\`, background: item.checked ? 'var(--accent)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.checked && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, flex: 1, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'var(--text3)' : 'var(--text)', cursor: 'pointer' }} onClick={() => toggleItem(item.id)}>
                    {item.item}
                  </span>
                  <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, opacity: 0.5, padding: 0 }} title="Remover item">✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  const [nutritionTargets, setNutritionTargets] = useState<{ kcal: number; protein: number; carbs: number; fat: number } | null>(null)
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

        {/* Metas Fitness */}
        <FitnessGoals
          todayKcal={totals.kcal}
          todayProtein={totals.p}
          todayCarbs={totals.c}
          todayFat={totals.f}
          onTargetsChange={setNutritionTargets}
        />

        {/* Receitas Fit */}
        <ReceitasSection onAddToNutrition={async (r) => {
          const res = await fetch('/api/nutrition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              food_name: r.name,
              portion_g: 1,
              calories_kcal: r.kcal,
              protein_g: r.protein,
              carbs_g: r.carbs,
              fat_g: r.fat,
              log_date: today,
            }),
          })
          if (res.ok) {
            const json = await res.json()
            setFoodLogs(prev => [...prev, json.log])
          }
        }} />

        {/* Lista de Compras */}
        <ShoppingListSection />

        {/* Histórico Nutricional */}
        <NutritionHistory
          targets={nutritionTargets}
          todayKcal={totals.kcal}
          todayProtein={totals.p}
        />

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
