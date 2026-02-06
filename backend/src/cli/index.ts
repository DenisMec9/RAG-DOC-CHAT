import "dotenv/config";
import path from "path";
import { indexDocuments } from "../ingestion/indexDocuments.js";

function printUsage() {
  console.log("Uso:");
  console.log("  npm run index -- <caminho1> <caminho2> ...");
  console.log("Exemplo:");
  console.log("  npm run index -- docs/arquivo.pdf docs/nota.txt");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const filePaths = args.map((arg) => path.resolve(arg));
  
  // Map string[] to DocumentInput[]
  const fileInputs = filePaths.map((filePath) => {
    const input: { path: string; originalName?: string } = {
      path: filePath,
    };
    return input;
  });
  
  await indexDocuments(fileInputs);
  console.log(`Indexados ${filePaths.length} arquivo(s).`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : "Erro ao indexar";
  console.error(message);
  process.exit(1);
});
