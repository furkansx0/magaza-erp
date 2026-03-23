export interface FinanceStats {
    totalDebt: number
    overdueDebt: number
    upcomingDebt: number
    topDebtor: { name: string, balance: number } | null
}

export interface SupplierWithBalance {
    id: string
    name: string
    phone: string | null
    address: string | null
    balance: number
    overdue: number
    upcoming: number
}
