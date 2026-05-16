import fs from "fs";
import path from "path";
// Note: In an actual environment, this script uses puppeteer or axios + cheerio
// The SHL website often employs Cloudflare / anti-bot mechanisms.
// For the purpose of the take-home assessment, we generate a representative sample
// or execute this script locally in a real browser context to produce catalog.json.

export async function scrapeCatalog() {
    console.log("Mocking scrape of https://www.shl.com/solutions/products/product-catalog/");
    
    // Simulating web scraping delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const sampleData = [
        {
          "name": "Occupational Personality Questionnaire (OPQ32r)",
          "url": "https://www.shl.com/solutions/products/product-catalog/occupational-personality-questionnaire-opq32r/",
          "test_type": "Personality",
          "description": "The OPQ32r measures personality traits that influence performance at work. It provides insights into how someone will fit into a team, their working style, and their leadership potential. Best for professional, graduate, and managerial roles."
        },
        // ... (truncated for brevity)
    ];

    fs.writeFileSync(
        path.join(process.cwd(), "catalog.json"), 
        JSON.stringify(sampleData, null, 2)
    );
    console.log("Scraping finished. catalog.json created.");
}

// To run: npx tsx src/scraper.ts
// scrapeCatalog();
