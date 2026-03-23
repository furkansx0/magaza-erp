export default function ProductsLoading() {
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100 p-4 gap-4">
            {/* Header Skeleton */}
            <div className="bg-white border rounded p-4 flex justify-between items-center h-16 shadow-sm">
                <div className="h-8 w-[200px] animate-pulse bg-gray-200 rounded-md" />
                <div className="flex gap-2">
                    <div className="h-9 w-[100px] animate-pulse bg-gray-200 rounded-md" />
                    <div className="h-9 w-[100px] animate-pulse bg-gray-200 rounded-md" />
                </div>
            </div>

            {/* Filter Bar Skeleton */}
            <div className="bg-white border rounded p-3 flex gap-2 overflow-x-auto shadow-sm">
                <div className="h-7 w-[120px] animate-pulse bg-gray-200 rounded-md" />
                <div className="h-7 w-[120px] animate-pulse bg-gray-200 rounded-md" />
                <div className="h-7 w-[120px] animate-pulse bg-gray-200 rounded-md" />
                <div className="h-7 w-[120px] animate-pulse bg-gray-200 rounded-md" />
                <div className="h-7 w-[120px] animate-pulse bg-gray-200 rounded-md" />
            </div>

            {/* Grid Skeleton */}
            <div className="bg-white border rounded-md flex-1 shadow-inner overflow-hidden">
                <div className="grid grid-cols-10 gap-px bg-gray-200 border-b">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="bg-gray-100 p-2 h-10 flex items-center">
                            <div className="h-4 w-full animate-pulse bg-gray-200 rounded-md" />
                        </div>
                    ))}
                </div>
                <div className="space-y-px bg-gray-200">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-10 gap-px">
                            {Array.from({ length: 10 }).map((_, j) => (
                                <div key={j} className="bg-white p-2 h-10 flex items-center">
                                    <div className="h-4 w-full animate-pulse bg-gray-200 rounded-md opacity-50" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
