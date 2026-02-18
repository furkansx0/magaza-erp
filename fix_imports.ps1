$files = @(
    "src/actions/pos/pos-actions.ts",
    "src/actions/inventory/create-matrix.ts",
    "src/actions/inventory/archive-product.ts",
    "src/actions/finance/finance-actions.ts",
    "src/actions/crm/customer-actions.ts",
    "src/actions/crm/campaign-product-actions.ts"
)

foreach ($path in $files) {
    $fullPath = Join-Path (Get-Location) $path
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        if ($content -match 'from "./audit-actions"') {
            $content = $content -replace 'from "./audit-actions"', 'from "@/actions/settings/audit-actions"'
            Set-Content -Path $fullPath -Value $content -Encoding UTF8 -NoNewline
            Write-Host "Fixed audit-actions in $path"
        }
    }
}

# Fix inventory/bulk-import-action.ts (barcode-actions is in the same folder inventory, so ./ is correct IF barcode-actions is there)
# Let's check if barcode-actions is in inventory. Yes it is. So that one might be fine.
# But wait, create-matrix -> audit-actions is broken.

# let's just fix known broken ones.
$financeFiles = @("src/actions/finance/expense-actions.ts", "src/actions/finance/cash-closing-actions.ts")
foreach ($path in $financeFiles) {
    $fullPath = Join-Path (Get-Location) $path
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        # cash-actions is in finance folder, so ./cash-actions is correct.
        # Ensure we don't break it. If it was moved successfully, ./ is correct.
    }
}
