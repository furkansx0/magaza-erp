export async function printBarcode(variant: {
    modelName?: string;
    sku?: string;
    barcode?: string;
    size?: string;
    season?: string;
    salePrice?: number | string;
}) {
    // 1. Isim ve satır kırma (Word Wrap logic)
    // "Tasarımda X:10 noktasından başlayan stok adı/kodu çok uzun olabilir. 16 karakteri aşıyorsa iki satıra bölünür."
    const nameStr = (variant.modelName || variant.sku || "").trim();
    const firstLine = nameStr.substring(0, 16);
    const secondLine = nameStr.substring(16, 32); 

    const beden = variant.size || "";
    const sezon = variant.season || "";
    const fiyat = variant.salePrice ? String(variant.salePrice) : "0";
    const barkod = variant.barcode || "";

    if (!barkod || barkod === "-") {
        throw new Error("Ürünün barkodu bulunamadı");
    }

    // 2. PPLA Raw Data Şablonu (Pad edilmiş, sabit pozisyonlarda)
    let raw_data = `<STX>L\nD11\n`;
    raw_data += `192200000860010${firstLine}\n`;
    if (secondLine) {
        raw_data += `192200000660010${secondLine}\n`;
    }
    raw_data += `193300000400146${beden}\n`;
    raw_data += `192200000870148${sezon}\n`;
    raw_data += `192200000350010${fiyat} TL\n`;
    raw_data += `1E2202000030005${barkod}\n`;
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
