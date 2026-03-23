"use client"

import { useStores } from "@/hooks/use-stores";
import { StoreCard } from "./store-card";
import { Store as StoreIcon } from "lucide-react";

interface StoreListClientProps {
    initialData: any[];
}

export function StoreListClient({ initialData }: StoreListClientProps) {
    const { stores, isLoading } = useStores({ data: initialData });

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((store: any) => (
                <StoreCard key={store.id} store={store} />
            ))}

            {stores.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <StoreIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Henüz Mağaza Yok</h3>
                    <p className="text-muted-foreground mb-4 text-center max-w-sm">
                        Sistemi kullanmaya başlamak için ilk mağazanızı oluşturun.
                    </p>
                </div>
            )}
        </div>
    );
}
