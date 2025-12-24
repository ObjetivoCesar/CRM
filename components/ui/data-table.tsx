"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    SortingState,
    getSortedRowModel,
    ColumnFiltersState,
    getFilteredRowModel,
    VisibilityState,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Loader2 } from "lucide-react"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    // Manual pagination props
    pageCount?: number
    rowCount?: number
    onPaginationChange?: (pageIndex: number, pageSize: number) => void
    onSortingChange?: (sorting: SortingState) => void
    onColumnFiltersChange?: (filters: ColumnFiltersState) => void
    // State
    sorting?: SortingState
    columnFilters?: ColumnFiltersState
    pagination?: {
        pageIndex: number
        pageSize: number
    }
    isLoading?: boolean
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pageCount,
    rowCount,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    sorting,
    columnFilters,
    pagination,
    isLoading = false,
}: DataTableProps<TData, TValue>) {

    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    // If manual props are provided, use them. Otherwise default to client-side.
    const isServerSide = !!onPaginationChange

    const table = useReactTable({
        data,
        columns,
        pageCount: pageCount ?? -1,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination: isServerSide ? pagination : undefined,
        },
        enableRowSelection: true,
        manualPagination: isServerSide,
        manualSorting: !!onSortingChange,
        manualFiltering: !!onColumnFiltersChange,
        onSortingChange: (updater) => {
            if (typeof updater === 'function') {
                onSortingChange?.(updater(sorting || []))
            } else {
                onSortingChange?.(updater)
            }
        },
        onColumnFiltersChange: (updater) => {
            if (typeof updater === 'function') {
                onColumnFiltersChange?.(updater(columnFilters || []))
            } else {
                onColumnFiltersChange?.(updater)
            }
        },
        onPaginationChange: (updater) => {
            if (isServerSide && pagination) {
                if (typeof updater === 'function') {
                    const newPagination = updater(pagination)
                    onPaginationChange(newPagination.pageIndex, newPagination.pageSize)
                } else {
                    onPaginationChange(updater.pageIndex, updater.pageSize)
                }
            }
        },
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        // Client side fallbacks
        getPaginationRowModel: !isServerSide ? getPaginationRowModel() : undefined,
        getSortedRowModel: !isServerSide ? getSortedRowModel() : undefined,
        getFilteredRowModel: !isServerSide ? getFilteredRowModel() : undefined,
    })

    return (
        <div className="space-y-4">
            {/* Filters (Basic example, can be extended) */}
            <div className="flex items-center justify-between">
                <Input
                    placeholder="Filtrar..."
                    value={(table.getColumn("businessName")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("businessName")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />

                <div className="flex items-center space-x-2">
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto">
                                Columnas <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    {isLoading ? "Cargando datos..." : "No se encontraron resultados."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} de{" "}
                    {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Anterior
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Siguiente
                    </Button>
                </div>
            </div>
        </div>
    )
}
