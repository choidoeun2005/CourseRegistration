import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import openai from "./openaiClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vectorStoreDataPath = path.join(__dirname, "../data/vectorStore.json");

function ensureVectorStoreFileExists() {
    if (!fs.existsSync(vectorStoreDataPath)) {
        fs.writeFileSync(
            vectorStoreDataPath,
            JSON.stringify({ vectorStoreId: "" }, null, 2)
        );
    }
}

function readVectorStoreData() {
    ensureVectorStoreFileExists();

    const raw = fs.readFileSync(vectorStoreDataPath, "utf-8");
    return JSON.parse(raw);
}

function writeVectorStoreData(data) {
    fs.writeFileSync(vectorStoreDataPath, JSON.stringify(data, null, 2));
}

export function getExistingVectorStoreId() {
    const data = readVectorStoreData();
    return data.vectorStoreId || "";
}

export async function getOrCreateVectorStore() {
    const data = readVectorStoreData();

    if (data.vectorStoreId) {
        return data.vectorStoreId;
    }

    const vectorStore = await openai.vectorStores.create({
        name: "course_syllabi"
    });

    writeVectorStoreData({
        vectorStoreId: vectorStore.id
    });

    return vectorStore.id;
}

export async function uploadSyllabusToVectorStore(filePath) {
    const vectorStoreId = await getOrCreateVectorStore();

    const uploadedFile = await openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: "assistants"
    });

    await openai.vectorStores.files.create(vectorStoreId, {
        file_id: uploadedFile.id
    });

    return {
        fileId: uploadedFile.id,
        vectorStoreId
    };
}