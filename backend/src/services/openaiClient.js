import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.warn(
        "OPENAI_API_KEY가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
    );
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default openai;