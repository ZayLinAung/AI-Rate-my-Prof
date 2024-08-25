import { NextResponse } from "next/server";
const { chromium } = require("playwright");
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"


// Init Pinecone
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});
const index = pc.index('rateprof').namespace('test1');

// Init embedding model
const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: process.env.GEMINIAI_API_KEY, model: "text-embedding-004" });

let browser;
let context;

const initBrowser = async () => {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
        context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
        });
        await context.route('**/*.{png,jpg,jpeg,gif,svg,css,font}', route => route.abort());
    }
};

const scrapeRMP = async (professorUrl) => {
    await initBrowser();
    const page = await context.newPage();

    try {
        await page.goto(professorUrl, { waitUntil: 'domcontentloaded' });

        const data = await page.evaluate(() => {
            const getTextContent = (selector) => document.querySelector(selector)?.textContent.trim() || '';

            return {
                professor: `${getTextContent('div[class^="NameTitle__Name"] span')} ${getTextContent('div[class^="NameTitle__Name"] span[class^="NameTitle__LastNameWrapper-dowf0z-2 glXOHH"]')}`,
                department: getTextContent('a[class^="TeacherDepartment__StyledDepartmentLink-fl79e8-0 iMmVHb"] b'),
                subject: getTextContent('div[class^="RatingHeader__StyledClass-sc-1dlkqw1-3 eXfReS"]'),
                rating: getTextContent('div[class^="RatingValue__Numerator-qw8sqy-2 liyUjw"]'),
                review: getTextContent('div[class^="Comments__StyledComments-dzzyvm-0 gRjWel"]'),
            };
        });

        return [data];
    } catch (error) {
        console.error("Error while scraping:", error);
        return [];
    } finally {
        await page.close();
    }
}


const inertToPinecone = async (url) => {
    const docs = await scrapeRMP(url);
    if (!docs || docs.length === 0) {
        console.error("No data scraped");
        return;
    }

    const vectorDocs = await Promise.all(docs.map(async (doc, i) => {
        const docString = JSON.stringify(doc);
        const embedding = await embeddings.embedQuery(docString);
        return {
            id: doc.professor,
            values: embedding,
            metadata: {
                review: doc.review,
                department: doc.department,
                subject: doc.subject,
                stars: doc.rating
            }
        };
    }));
    await index.upsert(vectorDocs);
}

export async function POST(req) {

    const { url } = await req.json();
    const res = await inertToPinecone(url);

    // for debugging: to see what the scrape returns
    //const res = await scrapeRMP(url);

    return NextResponse.json({ result: res })
}