import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export interface CatalogItem {
  name: string;
  url: string;
  test_type: string;
  description: string;
}

export interface ScrapedCatalogItem extends CatalogItem {
  embedding?: number[];
}

let catalog: ScrapedCatalogItem[] = [];
let ai: GoogleGenAI | null = null;
let embeddingPromise: Promise<ScrapedCatalogItem[]> | null = null;

function getAIClient() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

async function doLoadCatalog() {
  const catalogPath = path.join(process.cwd(), 'catalog.json');
  const fileContent = fs.readFileSync(catalogPath, 'utf-8');
  catalog = JSON.parse(fileContent);

  const aiClient = getAIClient();
  
  console.log('Computing embeddings for catalog...');
  const contents = catalog.map(item => `${item.name}: ${item.description}`);
  
  try {
    const response = await aiClient.models.embedContent({
      model: 'text-embedding-004',
      contents: contents,
    });
    
    if (response.embeddings) {
        response.embeddings.forEach((emb, i) => {
            catalog[i].embedding = emb.values;
        });
    }
  } catch(e: any) {
      console.error("Failed to compute embeddings", e);
      throw e;
  }
  
  console.log('Catalog loaded and embedded.');
  return catalog;
}

export function loadCatalog() {
    if (catalog.length > 0) return Promise.resolve(catalog);
    if (!embeddingPromise) {
        embeddingPromise = doLoadCatalog().catch(e => {
            embeddingPromise = null;
            throw e;
        });
    }
    return embeddingPromise;
}

function cosineSimilarity(A: number[], B: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieveTopK(query: string, k: number = 10): Promise<CatalogItem[]> {
  await loadCatalog();
  const aiClient = getAIClient();
  let queryEmbedding: number[] | undefined;
  
  try {
      const queryEmbeddingRes = await aiClient.models.embedContent({
          model: 'text-embedding-004',
          contents: [query]
      });
      queryEmbedding = queryEmbeddingRes.embeddings?.[0]?.values;
  } catch(e: any) {
      console.error("Failed to embed query:", e);
      throw e;
  }
  
  if (!queryEmbedding) {
      return catalog.slice(0, k).map(c => {
          const { embedding, ...rest } = c;
          return rest;
      });
  }

  const scoredItems = catalog.map(item => {
    const similarity = item.embedding ? cosineSimilarity(queryEmbedding!, item.embedding) : 0;
    return { item, similarity };
  });

  scoredItems.sort((a, b) => b.similarity - a.similarity);

  return scoredItems.slice(0, k).map(si => {
      const { embedding, ...rest } = si.item;
      return rest;
  });
}
