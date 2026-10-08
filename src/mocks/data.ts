import {
  CHANNELS,
  COUNTRIES,
  type Channel,
  type Country,
  type LineItem,
  type Order,
  type OrderDetail,
  type OrderStatus,
} from '../types'

export const TOTAL_ORDERS = 25_000

/** Small seeded PRNG so every visitor (and every test run) sees the same dataset. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST_NAMES = [
  'Aarav', 'Asha', 'Rohan', 'Priya', 'Vikram', 'Neha', 'Arjun', 'Kavya', 'Ishaan', 'Meera',
  'Liam', 'Olivia', 'Noah', 'Emma', 'Lucas', 'Mia', 'Ethan', 'Sofia', 'Omar', 'Layla',
  'Hiro', 'Yuki', 'Chen', 'Mei', 'Lena', 'Felix', 'Zara', 'Kabir', 'Anaya', 'Dev',
]
const LAST_NAMES = [
  'Sharma', 'Patel', 'Gupta', 'Nagpal', 'Iyer', 'Reddy', 'Khan', 'Singh', 'Mehta', 'Kapoor',
  'Smith', 'Johnson', 'Brown', 'Garcia', 'Müller', 'Schmidt', 'Tanaka', 'Wang', 'Rossi', "O'Brien",
]
const PRODUCTS = [
  'Wireless Earbuds', 'Mechanical Keyboard', 'USB-C Hub', 'Laptop Stand', '4K Monitor', 'Webcam',
  'Desk Lamp', 'Noise-cancelling Headphones', 'Smart Watch', 'Portable SSD', 'Ergonomic Mouse',
  'Phone Case', 'Charging Dock', 'Bluetooth Speaker', 'Fitness Band',
]
const CITIES: Record<Country, readonly string[]> = {
  IN: ['Gurugram', 'Bengaluru', 'Mumbai', 'Delhi', 'Pune'],
  US: ['Austin', 'Seattle', 'New York'],
  GB: ['London', 'Manchester'],
  DE: ['Berlin', 'Munich'],
  AE: ['Dubai', 'Abu Dhabi'],
  SG: ['Singapore'],
  AU: ['Sydney', 'Melbourne'],
  CA: ['Toronto', 'Vancouver'],
}

const STATUS_WEIGHTS: [OrderStatus, number][] = [
  ['delivered', 0.42],
  ['shipped', 0.18],
  ['paid', 0.14],
  ['pending', 0.12],
  ['cancelled', 0.08],
  ['refunded', 0.06],
]

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!
}

function weightedStatus(rand: () => number): OrderStatus {
  let roll = rand()
  for (const [status, weight] of STATUS_WEIGHTS) {
    roll -= weight
    if (roll <= 0) return status
  }
  return 'delivered'
}

const DATASET_END = Date.UTC(2026, 9, 1)
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

export function orderId(index: number): string {
  return `ORD-${String(index + 1).padStart(5, '0')}`
}

function generateOrders(count: number): Order[] {
  const rand = mulberry32(20261008)
  const orders: Order[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const first = pick(rand, FIRST_NAMES)
    const last = pick(rand, LAST_NAMES)
    const items = 1 + Math.floor(rand() ** 2 * 8)
    orders[i] = {
      id: orderId(i),
      customer: `${first} ${last}`,
      email: `${first}.${last}${Math.floor(rand() * 100)}@example.com`.toLowerCase().replace(/[^a-z0-9.@]/g, ''),
      status: weightedStatus(rand),
      channel: pick<Channel>(rand, CHANNELS),
      country: pick<Country>(rand, COUNTRIES),
      amount: Math.round((300 + rand() * 9_700) * items),
      items,
      createdAt: new Date(DATASET_END - Math.floor(rand() * YEAR_MS)).toISOString(),
    }
  }
  return orders
}

let orders: Order[] | null = null

export function getOrders(): Order[] {
  orders ??= generateOrders(TOTAL_ORDERS)
  return orders
}

export function getOrderDetail(id: string): OrderDetail | undefined {
  const match = /^ORD-(\d{5})$/.exec(id)
  if (!match) return undefined
  const order = getOrders()[Number(match[1]) - 1]
  if (!order) return undefined

  const rand = mulberry32(Number(match[1]))
  const lineItems: LineItem[] = []
  let remaining = order.amount
  for (let i = 0; i < order.items; i++) {
    const isLast = i === order.items - 1
    const unitPrice = isLast ? remaining : Math.round(remaining * (0.2 + rand() * 0.4))
    remaining -= unitPrice
    lineItems.push({
      sku: `SKU-${Math.floor(rand() * 90_000 + 10_000)}`,
      name: pick(rand, PRODUCTS),
      quantity: 1,
      unitPrice,
    })
  }

  return {
    ...order,
    lineItems,
    shippingAddress: `${Math.floor(rand() * 400) + 1}, ${pick(rand, ['MG Road', 'High Street', 'Park Avenue', 'Sector 29', 'Main Street'])}, ${pick(rand, CITIES[order.country])}`,
    phone: `+${order.country === 'IN' ? '91' : '1'} 9${String(Math.floor(rand() * 1e9)).padStart(9, '0')}`,
    notes: rand() < 0.3 ? 'Customer requested gift wrapping.' : '',
  }
}
