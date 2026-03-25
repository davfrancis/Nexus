// Verifica se a requisição vem da Vercel Cron ou tem o CRON_SECRET correto
export function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}
