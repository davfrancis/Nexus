'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Transaction, FinancialGoal } from '@/types/database'

export interface NewTransaction {
  description: string
  amount: number
  type: 'expense' | 'income'
  category: string
  date: string
  repeat_type?: 'none' | 'monthly'
  installments?: { count: number; amount_per?: number }
}

export function useFinancas() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-12
  const [year,  setYear]  = useState(today.getFullYear())

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals,        setGoals]        = useState<FinancialGoal[]>([])
  const [loadingTx,    setLoadingTx]    = useState(true)
  const [loadingGoals, setLoadingGoals] = useState(true)

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async (m = month, y = year) => {
    setLoadingTx(true)
    try {
      const res = await fetch(`/api/financas/transactions?month=${m}&year=${y}`)
      if (res.ok) {
        const json = await res.json()
        setTransactions(json.transactions ?? [])
      }
    } finally {
      setLoadingTx(false)
    }
  }, [month, year])

  const fetchGoals = useCallback(async () => {
    setLoadingGoals(true)
    try {
      const res = await fetch('/api/financas/goals')
      if (res.ok) {
        const json = await res.json()
        setGoals(json.goals ?? [])
      }
    } finally {
      setLoadingGoals(false)
    }
  }, [])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])
  useEffect(() => { fetchGoals() },        [fetchGoals])

  // ── Month navigation ─────────────────────────────────────────
  const prevMonth = useCallback(() => {
    let m = month - 1, y = year
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
    fetchTransactions(m, y)
  }, [month, year, fetchTransactions])

  const nextMonth = useCallback(() => {
    let m = month + 1, y = year
    if (m > 12) { m = 1; y++ }
    setMonth(m); setYear(y)
    fetchTransactions(m, y)
  }, [month, year, fetchTransactions])

  // ── Transactions CRUD ────────────────────────────────────────
  const addTransaction = useCallback(async (tx: NewTransaction): Promise<Transaction[] | null> => {
    const res = await fetch('/api/financas/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    })
    if (!res.ok) return null
    const json = await res.json()
    // Refresh to get all (including recurring/installments for this month)
    await fetchTransactions()
    return json.transactions
  }, [fetchTransactions])

  const updateTransaction = useCallback(async (
    id: string,
    updates: Partial<Transaction>,
    applyToGroup = false
  ): Promise<boolean> => {
    const res = await fetch(`/api/financas/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, apply_to_group: applyToGroup }),
    })
    if (!res.ok) return false
    await fetchTransactions()
    return true
  }, [fetchTransactions])

  const deleteTransaction = useCallback(async (id: string, deleteGroup = false): Promise<boolean> => {
    const url = `/api/financas/transactions/${id}${deleteGroup ? '?group=1' : ''}`
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) return false
    setTransactions(prev => {
      if (!deleteGroup) return prev.filter(t => t.id !== id)
      const tx = prev.find(t => t.id === id)
      if (!tx?.installment_group) return prev.filter(t => t.id !== id)
      return prev.filter(t => !(
        t.installment_group === tx.installment_group &&
        (t.installment_num ?? 0) >= (tx.installment_num ?? 0)
      ))
    })
    return true
  }, [])

  // ── Goals CRUD ───────────────────────────────────────────────
  const addGoal = useCallback(async (goal: Omit<FinancialGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FinancialGoal | null> => {
    const res = await fetch('/api/financas/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    })
    if (!res.ok) return null
    const json = await res.json()
    setGoals(prev => [json.goal, ...prev])
    return json.goal
  }, [])

  const updateGoal = useCallback(async (id: string, updates: Partial<FinancialGoal>): Promise<boolean> => {
    const res = await fetch(`/api/financas/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) return false
    const json = await res.json()
    setGoals(prev => prev.map(g => g.id === id ? json.goal : g))
    return true
  }, [])

  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/financas/goals/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    setGoals(prev => prev.filter(g => g.id !== id))
    return true
  }, [])

  const addToGoal = useCallback(async (id: string, amount: number): Promise<boolean> => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return false
    const newAmount = Math.min(goal.target_amount, goal.current_amount + amount)
    return updateGoal(id, { current_amount: newAmount })
  }, [goals, updateGoal])

  // ── Derived stats ─────────────────────────────────────────────
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const balance      = totalIncome - totalExpense

  return {
    month, year, prevMonth, nextMonth,
    transactions, goals,
    loadingTx, loadingGoals,
    totalExpense, totalIncome, balance,
    addTransaction, updateTransaction, deleteTransaction,
    addGoal, updateGoal, deleteGoal, addToGoal,
    refresh: fetchTransactions,
  }
}
