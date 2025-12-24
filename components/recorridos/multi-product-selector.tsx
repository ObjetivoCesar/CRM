"use client"

import { useState, useMemo } from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Product {
    id: string
    name: string
    "Nombre del Producto o Servicio": string
    "Categoría para Blog"?: string
    "Precio"?: number
}

interface MultiProductSelectorProps {
    products: Product[]
    selectedProducts: string[]
    onSelectionChange: (selected: string[]) => void
    label?: string
}

export function MultiProductSelector({
    products,
    selectedProducts,
    onSelectionChange,
    label = "Productos/Servicios de Interés"
}: MultiProductSelectorProps) {
    const [categoryFilter, setCategoryFilter] = useState<string>("all")

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p["Categoría para Blog"]).filter(Boolean))
        return Array.from(cats).sort()
    }, [products])

    // Filter products by category
    const filteredProducts = useMemo(() => {
        if (categoryFilter === "all") return products
        return products.filter(p => p["Categoría para Blog"] === categoryFilter)
    }, [products, categoryFilter])

    // Get selected product objects
    const selectedProductObjects = useMemo(() => {
        return products.filter(p => selectedProducts.includes(p["Nombre del Producto o Servicio"]))
    }, [products, selectedProducts])

    const toggleProduct = (productName: string) => {
        const newSelection = selectedProducts.includes(productName)
            ? selectedProducts.filter(p => p !== productName)
            : [...selectedProducts, productName]
        onSelectionChange(newSelection)
    }

    const removeProduct = (productName: string) => {
        onSelectionChange(selectedProducts.filter(p => p !== productName))
    }

    const clearAll = () => {
        onSelectionChange([])
    }

    return (
        <div className="form-field mb-6 space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-900 pl-1">{label}</Label>
                {selectedProducts.length > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="h-auto p-1 text-xs text-gray-600 hover:text-gray-900"
                    >
                        Limpiar todo
                    </Button>
                )}
            </div>

            {/* Category Filter Dropdown */}
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700 pl-1">Filtrar por Categoría</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full p-3 border-2 border-gray-300 rounded-xl text-sm bg-white text-gray-900 hover:border-primary transition-colors">
                        <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 max-h-[300px]">
                        <SelectItem value="all" className="text-gray-900 focus:bg-blue-50 focus:text-gray-900">
                            📋 Todas las categorías ({products.length})
                        </SelectItem>
                        {categories.map(cat => {
                            const count = products.filter(p => p["Categoría para Blog"] === cat).length
                            return (
                                <SelectItem
                                    key={cat}
                                    value={cat as string}
                                    className="text-gray-900 focus:bg-blue-50 focus:text-gray-900"
                                >
                                    📁 {cat} ({count})
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
            </div>

            {/* Selected Products Display */}
            {selectedProducts.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700 pl-1">
                        Seleccionados ({selectedProducts.length})
                    </Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-green-50 rounded-xl border-2 border-green-200">
                        {selectedProductObjects.map(product => (
                            <Badge
                                key={product.id}
                                className="bg-green-600 text-white hover:bg-green-700 pr-1 text-sm py-1"
                            >
                                {product["Nombre del Producto o Servicio"]}
                                <button
                                    type="button"
                                    onClick={() => removeProduct(product["Nombre del Producto o Servicio"])}
                                    className="ml-2 hover:bg-white/20 rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Products List */}
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700 pl-1">
                    {categoryFilter === "all"
                        ? `Todos los Productos (${filteredProducts.length})`
                        : `${categoryFilter} (${filteredProducts.length})`
                    }
                </Label>
                <div className="max-h-[400px] overflow-y-auto border-2 border-gray-300 rounded-xl bg-white">
                    {filteredProducts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No hay productos en esta categoría
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {filteredProducts.map((product) => {
                                const isSelected = selectedProducts.includes(product["Nombre del Producto o Servicio"])
                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => toggleProduct(product["Nombre del Producto o Servicio"])}
                                        className={cn(
                                            "p-4 cursor-pointer transition-all hover:bg-blue-50",
                                            isSelected && "bg-blue-100 hover:bg-blue-100"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={cn(
                                                    "mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                                                    isSelected
                                                        ? "bg-primary border-primary"
                                                        : "border-gray-400 bg-white"
                                                )}
                                            >
                                                {isSelected && <Check className="h-4 w-4 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 text-sm">
                                                    {product["Nombre del Producto o Servicio"]}
                                                </div>
                                                {product["Categoría para Blog"] && (
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        📁 {product["Categoría para Blog"]}
                                                    </div>
                                                )}
                                            </div>
                                            {product["Precio"] && (
                                                <div className="text-sm font-semibold text-primary whitespace-nowrap">
                                                    ${product["Precio"]}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
