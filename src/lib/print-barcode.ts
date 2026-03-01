export async function printBarcode(variant: {
    modelName?: string;
    sku?: string;
    barcode?: string;
    size?: string;
    season?: string;
    color?: string; // Yeni renk argümanı
    salePrice?: number | string;
}) {
    // Türkçe karakterleri ve yazıcının desteklemeyeceği sembolleri temizle/değiştir
    const cleanStr = (str: string) => {
        if (!str) return "";
        return str
            .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
            .replace(/ü/g, 'u').replace(/Ü/g, 'U')
            .replace(/ş/g, 's').replace(/Ş/g, 'S')
            .replace(/ı/g, 'i').replace(/İ/g, 'I')
            .replace(/ö/g, 'o').replace(/Ö/g, 'O')
            .replace(/ç/g, 'c').replace(/Ç/g, 'C')
            .replace(/[^a-zA-Z0-9\s\.\,\-\/]/g, '') // Desteklenmeyen (Ã—, â€¢ vb) sembolleri uçur
            .trim();
    }

    const sku = cleanStr(variant.sku || "");
    const beden = cleanStr(variant.size || "");
    const sezon = cleanStr(variant.season || "");
    const renk = cleanStr(variant.color || "");
    const fiyat = variant.salePrice ? String(variant.salePrice) : "0";
    const barkod = cleanStr(variant.barcode || "");

    if (!barkod || barkod === "-") {
        throw new Error("Ürünün barkodu bulunamadı");
    }

    // Kullanıcının belirttiği tam PPLA şablonu
    let raw_data = `<STX>L\nD11\n`;
    raw_data += `192200000890003${sku}\n`;
    raw_data += `193300000860154${beden}\n`;
    raw_data += `192200000310144${sezon}\n`;
    raw_data += `192200000510140${renk}\n`;
    raw_data += `192200000310006${fiyat} TL\n`;
    raw_data += `1E2202000000003${barkod}\n`;
    raw_data += `Q0001\nE`;

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
