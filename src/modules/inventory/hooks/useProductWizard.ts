import * as React from "react"
import { toast } from "sonner"
import { createProductMatrix } from "@/actions/inventory/create-matrix"
import { updateProductMatrix } from "@/actions/inventory/product-edit-actions"
import { PRODUCT_TAXONOMY } from "@/lib/taxonomy"

export interface VariantGroup {
    id: string
    color: string
    sizes: string[]
    existing?: boolean
    originalSizes?: string[]
}

export function useProductWizard(
    open: boolean,
    stores: { id: string, name: string }[],
    initialProduct?: any,
    mode: "create" | "append" | "edit" = "create"
) {
    const [step, setStep] = React.useState(1)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const [model, setModel] = React.useState({
        name: "",
        modelCode: "",
        brand: "",
        gender: "Erkek",
        category: "",
        subCategory: "",
        material: "",
        style: "",
        season: "2024 Yaz",
        description: "",
    })

    React.useEffect(() => {
        if (open) {
            if (initialProduct) {
                setModel({
                    name: initialProduct.name || initialProduct.modelName || "",
                    modelCode: initialProduct.modelCode || "",
                    brand: initialProduct.brand || "",
                    gender: initialProduct.gender || "Erkek",
                    category: initialProduct.category || "",
                    subCategory: initialProduct.subCategory || "",
                    material: initialProduct.material || "",
                    style: initialProduct.style || "",
                    season: initialProduct.season || "2024 Yaz",
                    description: initialProduct.description || ""
                })

                if (mode === "append") {
                    setStep(2)
                } else if (mode === "edit") {
                    setStep(1)
                    if (initialProduct.variants) {
                        const groupsMap = new Map<string, VariantGroup>();
                        initialProduct.variants.forEach((v: any) => {
                            if (!groupsMap.has(v.color)) {
                                groupsMap.set(v.color, {
                                    id: `group-${v.color}`,
                                    color: v.color,
                                    sizes: [],
                                    existing: true,
                                    originalSizes: []
                                })
                            }
                            const g = groupsMap.get(v.color)!;
                            if (!g.sizes.includes(v.size)) {
                                g.sizes.push(v.size);
                                g.originalSizes?.push(v.size);
                            }
                        });
                        setVariantGroups(Array.from(groupsMap.values()));

                        const matrix = initialProduct.variants.map((v: any) => {
                            const stocksObj: Record<string, number> = {};
                            stores.forEach(s => stocksObj[s.id] = 0);
                            if (v.stocks) {
                                v.stocks.forEach((s: any) => {
                                    stocksObj[s.storeId] = s.quantity;
                                })
                            }
                            return {
                                id: v.id,
                                color: v.color,
                                size: v.size,
                                sku: v.sku,
                                barcode: v.barcode,
                                purchasePrice: v.purchasePrice,
                                salePrice: v.salePrice,
                                stocks: stocksObj,
                                enabled: true
                            }
                        });
                        setMatrixData(matrix);
                    }
                } else {
                    setStep(1)
                }
            } else {
                setStep(1)
                setModel({
                    name: "",
                    modelCode: "",
                    brand: "",
                    gender: "Erkek",
                    category: "",
                    subCategory: "",
                    material: "",
                    style: "",
                    season: "2024 Yaz",
                    description: "",
                })
                setVariantGroups([])
                setMatrixData([])
            }
        }
    }, [open, initialProduct, mode, stores])

    const currentGenderNode = React.useMemo(() => PRODUCT_TAXONOMY.find(t => t.value === model.gender), [model.gender])
    const defaultCategories = currentGenderNode?.children?.map(c => c.value) || []

    const [variantGroups, setVariantGroups] = React.useState<VariantGroup[]>([])
    const [currentColor, setCurrentColor] = React.useState("")
    const [currentSizes, setCurrentSizes] = React.useState<string[]>([])
    const [sizeInput, setSizeInput] = React.useState("")
    const [editingExistingGroup, setEditingExistingGroup] = React.useState(false)
    const [originalSizesOfEditingGroup, setOriginalSizesOfEditingGroup] = React.useState<string[]>([])
    const [matrixData, setMatrixData] = React.useState<any[]>([])

    const addSizeToGroup = () => {
        if (sizeInput && !currentSizes.includes(sizeInput)) {
            setCurrentSizes([...currentSizes, sizeInput])
            setSizeInput("")
        }
    }

    const addVariantGroup = () => {
        if (!currentColor) { toast.error("Lütfen bir renk girin"); return; }
        if (currentSizes.length === 0) { toast.error("En az bir beden ekleyin"); return; }

        const newGroup: VariantGroup = {
            id: Math.random().toString(),
            color: currentColor,
            sizes: [...currentSizes],
            existing: editingExistingGroup,
            originalSizes: editingExistingGroup ? [...originalSizesOfEditingGroup] : []
        }
        setVariantGroups([...variantGroups, newGroup])
        setCurrentColor("")
        setCurrentSizes([])
        setEditingExistingGroup(false)
        setOriginalSizesOfEditingGroup([])
    }

    const removeGroup = (id: string) => {
        setVariantGroups(variantGroups.filter(g => g.id !== id))
    }

    const generateMatrix = () => {
        if (variantGroups.length === 0) {
            toast.error("Lütfen en az bir varyant grubu oluşturun.");
            return;
        }

        const existingIdMap = new Map<string, string>();
        if (initialProduct && initialProduct.variants) {
            initialProduct.variants.forEach((v: any) => {
                const key = `${v.color}-${v.size}`;
                existingIdMap.set(key, v.id);
            });
        }

        const newMatrix: any[] = []
        const initialStocks: Record<string, number> = {}
        stores.forEach(s => initialStocks[s.id] = 0)

        const codePrefix = model.modelCode
            ? model.modelCode.toUpperCase().replace(/[^A-Z0-9-]/g, '')
            : model.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();

        variantGroups.forEach(group => {
            group.sizes.forEach(size => {
                const colorCode = group.color.substring(0, 3).toUpperCase();
                const sku = `${codePrefix}-${colorCode}-${size}`;
                const key = `${group.color}-${size}`;
                const existingId = existingIdMap.get(key);

                let barcode = "";
                let purchasePrice = 0;
                let salePrice = 0;
                let stocks = { ...initialStocks };

                const existingData = initialProduct?.variants?.find((v: any) => v.id === existingId);
                if (existingData) {
                    barcode = existingData.barcode;
                    purchasePrice = Number(existingData.purchasePrice);
                    salePrice = Number(existingData.salePrice);
                    if (existingData.stocks) {
                        existingData.stocks.forEach((s: any) => {
                            stocks[s.storeId] = s.quantity;
                        })
                    }
                }

                newMatrix.push({
                    id: existingId || `${group.color}-${size}-${Math.random()}`,
                    color: group.color,
                    size: size,
                    sku: sku,
                    barcode: barcode,
                    purchasePrice: purchasePrice,
                    salePrice: salePrice,
                    stocks: stocks,
                    enabled: true
                })
            })
        })
        setMatrixData(newMatrix)
        setStep(3)
    }

    const updateMatrixRow = (id: string, field: string, value: any) => {
        setMatrixData(prev => prev.map(row => {
            if (row.id === id) return { ...row, [field]: value }
            return row
        }))
    }

    const updateStock = (rowId: string, storeId: string, val: string) => {
        setMatrixData(prev => prev.map(row => {
            if (row.id === rowId) {
                return { ...row, stocks: { ...row.stocks, [storeId]: Number(val) } }
            }
            return row
        }))
    }

    const applyBulk = (field: string, value: any) => {
        setMatrixData(prev => prev.map(row => ({ ...row, [field]: value })))
    }

    const applyBulkStock = (storeId: string, value: string) => {
        const val = Number(value);
        setMatrixData(prev => prev.map(row => ({
            ...row,
            stocks: { ...row.stocks, [storeId]: val }
        })))
    }

    const onSubmit = async () => {
        setIsSubmitting(true)
        const activeVariants = matrixData.filter(r => r.enabled).map(r => ({
            id: r.id,
            color: r.color,
            size: r.size,
            barcode: r.barcode,
            sku: r.sku,
            purchasePrice: Number(r.purchasePrice),
            salePrice: Number(r.salePrice),
            stocks: r.stocks
        }))

        if (activeVariants.length === 0) {
            toast.error("Kaydedilecek aktif varyant yok.");
            setIsSubmitting(false);
            return;
        }

        try {
            let result;
            if (mode === "edit" && initialProduct) {
                result = await updateProductMatrix({
                    id: initialProduct.id,
                    ...model,
                    variants: activeVariants
                })
            } else {
                result = await createProductMatrix({
                    ...model,
                    variants: activeVariants,
                    existingModelId: mode === "append" && initialProduct ? (initialProduct.id || initialProduct.productId) : undefined
                })
            }

            if (result.success) {
                toast.success(result.message);
                setStep(4);
            } else {
                toast.error(result.message);
            }
        } catch (err: any) {
            toast.error("Hata: " + err.message);
        } finally {
            setIsSubmitting(false)
        }
    }

    const generateAllBarcodes = async () => {
        const rowsToBeFilled = matrixData.filter(r => r.enabled && !r.barcode);
        if (rowsToBeFilled.length === 0) {
            toast.info("Barkodu eksik olan aktif varyant yok.");
            return;
        }

        try {
            toast.loading("Sıradaki barkodlar getiriliyor...", { id: "barcode-gen" });
            const { generateNextBarcodes } = await import("@/actions/inventory/barcode-actions");
            const result = await generateNextBarcodes(rowsToBeFilled.length);

            if (!result.success || !result.barcodes) {
                toast.error(result.error || "Barkod üretilemedi.", { id: "barcode-gen" });
                return;
            }

            let barcodeIndex = 0;
            const updatedMatrix = matrixData.map(row => {
                if (row.enabled && !row.barcode) {
                    const newBarcode = result.barcodes![barcodeIndex];
                    barcodeIndex++;
                    return { ...row, barcode: newBarcode };
                }
                return row;
            });

            setMatrixData(updatedMatrix);
            toast.success(`${rowsToBeFilled.length} adet yeni barkod atandı.`, { id: "barcode-gen" });

        } catch (error) {
            toast.error("Bir hata oluştu.", { id: "barcode-gen" });
        }
    }

    return {
        step, setStep,
        isSubmitting,
        model, setModel,
        defaultCategories,
        variantGroups, setVariantGroups,
        currentColor, setCurrentColor,
        currentSizes, setCurrentSizes,
        sizeInput, setSizeInput,
        editingExistingGroup, setEditingExistingGroup,
        originalSizesOfEditingGroup, setOriginalSizesOfEditingGroup,
        matrixData, setMatrixData,
        addSizeToGroup,
        addVariantGroup,
        removeGroup,
        generateMatrix,
        updateMatrixRow,
        updateStock,
        applyBulk,
        applyBulkStock,
        onSubmit,
        generateAllBarcodes
    }
}
