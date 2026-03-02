function replaceTurkishChars(str: string): string {
    return str
        .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U').replace(/ü/g, 'u')
        .replace(/Ş/g, 'S').replace(/ş/g, 's')
        .replace(/İ/g, 'I').replace(/ı/g, 'i')
        .replace(/Ö/g, 'O').replace(/ö/g, 'o')
        .replace(/Ç/g, 'C').replace(/ç/g, 'c');
}

export async function printBarcode(variant: {
    modelName?: string;
    sku?: string;
    barcode?: string;
    size?: string;
    season?: string;
    color?: string; // Yeni renk argümanı
    salePrice?: number | string;
    quantity?: number; // Yazdırılacak miktar
}) {
    const qty = variant.quantity || 1;
    const qtyStr = String(qty).padStart(4, '0'); // Q0001 formatı için

    const sku = replaceTurkishChars((variant.sku || "").trim());
    const beden = replaceTurkishChars(variant.size || "");
    const sezon = replaceTurkishChars(variant.season || "");
    const renk = replaceTurkishChars(variant.color || "");
    const fiyat = variant.salePrice ? String(variant.salePrice) : "0";
    const barkod = variant.barcode || "";

    if (!barkod || barkod === "-") {
        throw new Error("Ürünün barkodu bulunamadı");
    }

    // Kullanıcının belirttiği tam PPLA şablonu
    let raw_data = `<STX>L\nD11\n`;

    // SKU'yu 15 karakterlik parçalara bölelim
    const skuChunks = [];
    for (let i = 0; i < sku.length; i += 15) {
        skuChunks.push(sku.substring(i, i + 15));
    }

    // Her bir parçayı ayrı metin satırı olarak ekle (Y ekseni 20 nokta aşağı kaydırılarak)
    let startY = 89;
    skuChunks.forEach((chunk) => {
        const yStr = String(startY).padStart(4, '0');
        raw_data += `1922000${yStr}0003${chunk}\n`;
        startY -= 20;
    });

    raw_data += `193300000860154${beden}\n`;
    raw_data += `192200000310144${sezon}\n`;
    raw_data += `192200000510140${renk}\n`;
    raw_data += `192200000310006${fiyat} TL\n`;
    raw_data += `1E2202000000003${barkod}\n`;
    raw_data += `Q${qtyStr}\nE`;

    const payload = { raw_data };

    try {
        const response = await fetch("http://localhost:5000/print", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return { success: true };
    } catch (e: any) {
        console.error("Print Error:", e);
        // "fetch isteği net::ERR_CONNECTION_REFUSED hatası alırsa kibar uyar."
        throw new Error("Yazıcıya ulaşılamadı. Arka plan servisinin (Local Print Server .exe veya Python scripti) açık olduğundan emin olun.");
    }
}
