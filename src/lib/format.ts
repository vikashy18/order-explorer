const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const compactCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const integer = new Intl.NumberFormat('en-IN')
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

export const formatCurrency = (value: number) => currency.format(value)
export const formatCompactCurrency = (value: number) => compactCurrency.format(value)
export const formatInteger = (value: number) => integer.format(value)
export const formatDate = (iso: string) => date.format(new Date(iso))
export const formatDateTime = (iso: string) => `${dateTime.format(new Date(iso))} UTC`

export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
