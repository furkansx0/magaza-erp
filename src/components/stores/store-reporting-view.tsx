"use client"

import type { DateRangeType } from '@/types/actions';
﻿import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/reporting/date-range-picker";
import { DashboardTab } from "./tabs/dashboard-tab";
import { ActivityTab } from "./tabs/activity-tab";
import { FinanceTab } from "./tabs/finance-tab";
import { StaffTab } from "./tabs/staff-tab";
;

interface StoreReportingViewProps {
    storeId: string;
}

export function StoreReportingView({ storeId }: StoreReportingViewProps) {
    const [dateRange, setDateRange] = useState<{
        range: DateRangeType;
        customStart?: Date;
        customEnd?: Date;
    }>({
        range: "today" // Default to Today as per "Dashboard needs to be realtime"
    });

    const [activeTab, setActiveTab] = useState("dashboard");

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <TabsList>
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="activity">Faaliyetler</TabsTrigger>
                        <TabsTrigger value="finance">Kasa & Mali</TabsTrigger>
                        <TabsTrigger value="staff">Personel</TabsTrigger>
                    </TabsList>

                    {/* Hide date picker on dashboard as it shows live data */}
                    {activeTab !== "dashboard" && (
                        <DateRangePicker
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                        />
                    )}
                </div>

                <TabsContent value="dashboard" className="space-y-4">
                    <DashboardTab storeId={storeId} />
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                    <ActivityTab storeId={storeId} dateRange={dateRange} />
                </TabsContent>

                <TabsContent value="finance" className="space-y-4">
                    <FinanceTab storeId={storeId} dateRange={dateRange} />
                </TabsContent>

                <TabsContent value="staff" className="space-y-4">
                    <StaffTab storeId={storeId} dateRange={dateRange} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
