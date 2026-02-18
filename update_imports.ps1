$replacements = @{
    "@/app/actions/pos-actions" = "@/actions/pos/pos-actions";
    "@/app/actions/customer-actions" = "@/actions/crm/customer-actions";
    "@/app/actions/campaign-actions" = "@/actions/crm/campaign-actions";
    "@/app/actions/campaign-product-actions" = "@/actions/crm/campaign-product-actions";
    "@/app/actions/gift-card-actions" = "@/actions/crm/gift-card-actions";
    "@/app/actions/finance-actions" = "@/actions/finance/finance-actions";
    "@/app/actions/expense-actions" = "@/actions/finance/expense-actions";
    "@/app/actions/cash-closing-actions" = "@/actions/finance/cash-closing-actions";
    "@/app/actions/cash-actions" = "@/actions/finance/cash-actions";
    "@/app/actions/settings-actions" = "@/actions/settings/settings-actions";
    "@/app/actions/store-actions" = "@/actions/settings/store-actions";
    "@/app/actions/user-actions" = "@/actions/settings/user-actions";
    "@/app/actions/update-store" = "@/actions/settings/update-store";
    "@/app/actions/audit-actions" = "@/actions/settings/audit-actions";
    "@/app/actions/activity-actions" = "@/actions/settings/activity-actions";
    "@/app/actions/reset-actions" = "@/actions/settings/reset-actions";
    "@/app/actions/seed-actions" = "@/actions/settings/seed-actions";
    "@/app/actions/seed-data" = "@/actions/settings/seed-data";
    "@/app/actions/auth" = "@/actions/settings/auth";
    "@/app/actions/report-actions" = "@/actions/settings/report-actions";
    "@/app/actions/store-reporting-actions" = "@/actions/settings/store-reporting-actions";
    "@/app/actions/archive-product" = "@/actions/inventory/archive-product";
    "@/app/actions/barcode-actions" = "@/actions/inventory/barcode-actions";
    "@/app/actions/bulk-actions" = "@/actions/inventory/bulk-actions";
    "@/app/actions/bulk-import-action" = "@/actions/inventory/bulk-import-action";
    "@/app/actions/bulk-transfer-action" = "@/actions/inventory/bulk-transfer-action";
    "@/app/actions/create-matrix" = "@/actions/inventory/create-matrix";
    "@/app/actions/delete-product" = "@/actions/inventory/delete-product";
    "@/app/actions/product-actions" = "@/actions/inventory/product-actions";
    "@/app/actions/product-edit-actions" = "@/actions/inventory/product-edit-actions";
    "@/app/actions/product-query-actions" = "@/actions/inventory/product-query-actions";
    "@/app/actions/stock-actions" = "@/actions/inventory/stock-actions";
    "@/app/actions/transfer-actions" = "@/actions/inventory/transfer-actions";
    "@/app/actions/transfer-recommendation-actions" = "@/actions/inventory/transfer-recommendation-actions";
    "@/app/actions/transfer-wizard-actions" = "@/actions/inventory/transfer-wizard-actions";
    "@/app/actions/update-model" = "@/actions/inventory/update-model";
    "@/app/actions/update-variant" = "@/actions/inventory/update-variant";
}

$files = Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts

foreach ($file in $files) {
    if ($file.Name -eq "update_imports.ps1") { continue }
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    foreach ($key in $replacements.Keys) {
        if ($content.Contains($key)) {
            $content = $content.Replace($key, $replacements[$key])
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Updated $($file.Name)"
    }
}
