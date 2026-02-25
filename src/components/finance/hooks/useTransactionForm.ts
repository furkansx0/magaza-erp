import { useState, useEffect } from "react"
import { addMonths } from "date-fns"
import { addTransactionBatch } from "@/actions/finance/finance-actions"
import { toast } from "sonner"

export interface PlanItem {
    id: number
    date: Date
    amount: number
    description: string
    documentNo?: string
}

export function useTransactionForm(supplierId: string, onSuccessAction?: () => void) {
    const [loading, setLoading] = useState(false)
    const [mainTab, setMainTab] = useState("purchase") // purchase | payment

    // Common Inputs
    const [totalAmount, setTotalAmount] = useState("")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState<Date>(new Date())

    // Purchase Specific
    const [purchaseType, setPurchaseType] = useState("credit") // cash | credit
    const [installmentCount, setInstallmentCount] = useState("1")
    const [firstDueDate, setFirstDueDate] = useState<Date>(new Date())
    const [downPayment, setDownPayment] = useState("") // Peşinat

    // Payment Specific
    const [paymentType, setPaymentType] = useState("cash") // cash | check
    const [checkCount, setCheckCount] = useState("1")
    const [checkStartMonth, setCheckStartMonth] = useState<Date>(new Date())
    const [checkDocumentStart, setCheckDocumentStart] = useState("")

    // The Plan
    const [plan, setPlan] = useState<PlanItem[]>([])
    const [isManualMode, setIsManualMode] = useState(false)

    // Effect to generate plan automatically
    useEffect(() => {
        if (!isManualMode) {
            generatePlan()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainTab, totalAmount, purchaseType, installmentCount, firstDueDate, paymentType, checkCount, checkStartMonth, checkDocumentStart, description, isManualMode, downPayment])

    const generatePlan = () => {
        const amount = parseFloat(totalAmount)
        const dp = parseFloat(downPayment) || 0

        if (isNaN(amount) || amount <= 0) {
            setPlan([])
            return
        }

        const items: PlanItem[] = []

        if (mainTab === "purchase") {
            if (purchaseType === "cash") {
                // Cash Purchase
                items.push({
                    id: 1,
                    date: date,
                    amount: amount,
                    description: description || "Peşin Mal Alışı",
                    documentNo: checkDocumentStart
                })
            } else {
                // Credit (Vadeli)

                // 1. Handle Down Payment (Peşinat) if exists
                if (dp > 0) {
                    items.push({
                        id: 0,
                        date: date, // Peşinat is due today (Invoice Date)
                        amount: dp,
                        description: `${description || "Vadeli Alış"} - Peşinat`,
                        documentNo: checkDocumentStart
                    })
                }

                // 2. Handle Installments from Remaining Amount
                const remainingAmount = amount - dp

                if (remainingAmount > 0) {
                    const count = parseInt(installmentCount) || 1
                    const perInstallment = remainingAmount / count

                    for (let i = 0; i < count; i++) {
                        const d = addMonths(firstDueDate, i)
                        items.push({
                            id: i + 1,
                            date: d,
                            amount: perInstallment,
                            description: `${description || "Vadeli Alış"} - Taksit ${i + 1}/${count}`,
                            documentNo: checkDocumentStart
                        })
                    }
                }
            }
        } else {
            // PAYMENT Logic
            if (paymentType === "cash") {
                items.push({
                    id: 1,
                    date: date,
                    amount: amount,
                    description: description || "Nakit Ödeme",
                    documentNo: checkDocumentStart
                })
            } else {
                // Check (Çek)
                const count = parseInt(checkCount) || 1
                const perCheck = amount / count

                for (let i = 0; i < count; i++) {
                    const d = addMonths(checkStartMonth, i)
                    items.push({
                        id: i + 1,
                        date: d,
                        amount: perCheck,
                        description: `${description || "Çek Ödemesi"} - ${i + 1}/${count}`,
                        documentNo: checkDocumentStart ? String(parseInt(checkDocumentStart) + i) : ""
                    })
                }
            }
        }
        setPlan(items)
    }

    const handlePlanChange = (index: number, field: keyof PlanItem, value: any) => {
        if (!isManualMode) return

        const newPlan = [...plan]
        newPlan[index] = { ...newPlan[index], [field]: value }
        setPlan(newPlan)
    }

    const toggleManualMode = () => {
        setIsManualMode(prev => !prev)
    }

    const planSum = plan.reduce((acc, item) => acc + (item.amount || 0), 0)
    const targetAmount = parseFloat(totalAmount) || 0
    const difference = targetAmount - planSum
    const isBalanced = Math.abs(difference) < 0.01

    const handleSubmit = async () => {
        if (plan.length === 0) return

        if (isManualMode && !isBalanced) {
            toast.error(`Plan toplamı (${planSum.toFixed(2)}) ile ana tutar (${targetAmount.toFixed(2)}) eşleşmiyor!`)
            return
        }

        setLoading(true)

        const transactionsToSave: any[] = plan.map(p => ({
            type: mainTab === "purchase" ? 0 : 1, // 0 For Purchase, 1 For Payments
            amount: p.amount,
            description: p.description,
            date: date, // Transaction Date
            dueDate: p.date, // Due Date
            documentNo: p.documentNo
        }));

        const res = await addTransactionBatch({ supplierId, transactions: transactionsToSave })

        setLoading(false)

        if (res.success) {
            toast.success(res.message)
            resetForm();
            if (onSuccessAction) onSuccessAction();
        } else {
            toast.error(res.message)
        }
    }

    const resetForm = () => {
        setTotalAmount("")
        setDescription("")
        setDownPayment("")
        setIsManualMode(false)
    }

    return {
        // States
        loading,
        mainTab,
        setMainTab,
        totalAmount,
        setTotalAmount,
        description,
        setDescription,
        date,
        setDate,
        purchaseType,
        setPurchaseType,
        installmentCount,
        setInstallmentCount,
        firstDueDate,
        setFirstDueDate,
        downPayment,
        setDownPayment,
        paymentType,
        setPaymentType,
        checkCount,
        setCheckCount,
        checkStartMonth,
        setCheckStartMonth,
        checkDocumentStart,
        setCheckDocumentStart,
        plan,
        isManualMode,
        planSum,
        targetAmount,
        difference,
        isBalanced,

        // Handlers
        handlePlanChange,
        toggleManualMode,
        handleSubmit,
        resetForm
    }
}
