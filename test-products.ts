import { db } from "./lib/db"
import { products } from "./lib/db/schema"

async function testProducts() {
    try {
        console.log("Testing products query...")
        const allProducts = await db.select().from(products)
        console.log(`Found ${allProducts.length} products`)

        if (allProducts.length > 0) {
            console.log("First product:", JSON.stringify(allProducts[0], null, 2))
        }

        return allProducts
    } catch (error) {
        console.error("Error:", error)
        throw error
    }
}

testProducts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Failed:", error)
        process.exit(1)
    })
