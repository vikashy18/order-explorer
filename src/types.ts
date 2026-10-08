export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const CHANNELS = ['web', 'mobile', 'marketplace', 'in-store'] as const
export type Channel = (typeof CHANNELS)[number]

export const COUNTRIES = ['IN', 'US', 'GB', 'DE', 'AE', 'SG', 'AU', 'CA'] as const
export type Country = (typeof COUNTRIES)[number]

export const SORT_FIELDS = ['createdAt', 'id', 'customer', 'status', 'items', 'amount'] as const
export type SortField = (typeof SORT_FIELDS)[number]
export type SortDir = 'asc' | 'desc'

export const PAGE_SIZES = [50, 100, 250, 500] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export interface Order {
  id: string
  customer: string
  email: string
  status: OrderStatus
  channel: Channel
  country: Country
  /** Order total in INR. */
  amount: number
  items: number
  createdAt: string
}

export interface LineItem {
  sku: string
  name: string
  quantity: number
  unitPrice: number
}

export interface OrderDetail extends Order {
  lineItems: LineItem[]
  shippingAddress: string
  phone: string
  notes: string
}

export interface OrdersQuery {
  q: string
  status: OrderStatus[]
  channel: Channel | ''
  country: Country | ''
  min: number | null
  max: number | null
  sort: SortField
  dir: SortDir
  page: number
  size: PageSize
}

export interface OrdersPage {
  items: Order[]
  total: number
  page: number
  size: number
  pageCount: number
}

export interface OrdersSummary {
  count: number
  revenue: number
  byStatus: Record<OrderStatus, number>
}
