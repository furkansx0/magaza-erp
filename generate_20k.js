const XLSX = require('xlsx');

const rows = [];
const brands = ["Nike", "Adidas", "Puma", "Reebok", "New Balance", "Vans", "Converse", "Skechers"];
const categories = ["Spor Ayakkabı", "Koşu Ayakkabısı", "Günlük", "Basketbol", "Outdoor", "Klasik Deri"];
const seasons = ["Yaz", "Kış", "İlkbahar", "Sonbahar", "4 Mevsim"];
const colors = ["Siyah", "Beyaz", "Kırmızı", "Mavi", "Yeşil", "Sarı", "Lacivert", "Gri", "Bordo", "Kahverengi"];
const sizes = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];

let variantCount = 0;
const totalTarget = 20000;
const totalModels = 500;

outer: for (let m = 1; m <= totalModels; m++) {
    const brand = brands[m % brands.length];
    const category = categories[m % categories.length];
    const season = seasons[m % seasons.length];
    const modelName = `${brand} Pro Serisi ${m}`;
    
    // Shuffle colors to give different combinations
    const modelColors = [...colors].sort(() => 0.5 - Math.random()).slice(0, 5); // 5 colors per model
    
    for (const color of modelColors) {
        for (const size of sizes) { // 11 sizes
            if (variantCount >= totalTarget) break outer;
            
            // Random 13 digit barcode
            const barcode = '869' + Math.floor(1000000000 + Math.random() * 9000000000).toString(); 
            const sku = `${brand.substring(0,3).toUpperCase()}-M${m}-${color.substring(0,3).toUpperCase()}-${size}`;
            
            const buyPrice = 500 + Math.floor(Math.random() * 800);
            const sellPrice = buyPrice * 1.5;
            const stock = Math.floor(Math.random() * 51); // 0-50
            
            rows.push({
                "Model Adı": modelName,
                "Marka": brand,
                "Kategori": category,
                "Sezon": season,
                "Renk": color,
                "Beden": size,
                "Stok Kodu": sku,
                "Barkod": barcode,
                "Alış Fiyatı": buyPrice,
                "Satış Fiyatı": sellPrice,
                "Hayırseven": stock // The store name column!
            });
            variantCount++;
        }
    }
}

const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");

const outputPath = "C:\\Users\\Furkan\\Downloads\\20bin_urun_test.xlsx";
XLSX.writeFile(workbook, outputPath);
console.log(`Successfully generated ${rows.length} products at ${outputPath}`);
