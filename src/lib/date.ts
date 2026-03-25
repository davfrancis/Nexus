// Retorna um objeto Date representando o horário atual em America/Sao_Paulo
// Usa o "fake local time" trick: converte para string BRT e re-parseia,
// permitindo usar date-fns normalmente sem precisar de date-fns-tz
export function nowBRT(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
}
