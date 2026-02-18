import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const existing = await prisma.store.findFirst({
        where: { name: "Test Şubesi (Kadıköy)" }
    })

    if (!existing) {
        await prisma.store.create({
            data: {
                name: "Test Şubesi (Kadıköy)",
                address: "Kadıköy Rıhtım, İstanbul",
                phone: "0555 111 22 33"
            }
        })
        console.log("Test mağazası oluşturuldu.")
    } else {
        console.log("Test mağazası zaten var.")
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
