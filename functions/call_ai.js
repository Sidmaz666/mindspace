import { Client } from "@gradio/client";


const DUMMY_QUESIONS = [
    {
      "question": "What is the capital of the land of Oz?",
      "options": [
        {"option_id": "a", "option_text": "Emerald City"},
        {"option_id": "b", "option_text": "Ruby Town"},
        {"option_id": "c", "option_text": "Sapphire City"},
        {"option_id": "d", "option_text": "Amethyst Village"}
      ],
      "answer": "a"
    },
    {
      "question": "Which animal is known for its ability to laugh?",
      "options": [
        {"option_id": "a", "option_text": "Giraffe"},
        {"option_id": "b", "option_text": "Hyena"},
        {"option_id": "c", "option_text": "Elephant"},
        {"option_id": "d", "option_text": "Koala"}
      ],
      "answer": "b"
    },
    {
      "question": "In which direction does a clockwise vortex spin?",
      "options": [
        {"option_id": "a", "option_text": "North"},
        {"option_id": "b", "option_text": "South"},
        {"option_id": "c", "option_text": "East"},
        {"option_id": "d", "option_text": "West"}
      ],
      "answer": "c"
    },
    {
      "question": "What is Batman’s favorite part of a joke?",
      "options": [
        {"option_id": "a", "option_text": "The punchline"},
        {"option_id": "b", "option_text": "The setup"},
        {"option_id": "c", "option_text": "The Joker"},
        {"option_id": "d", "option_text": "The bat-signal"}
      ],
      "answer": "c"
    },
    {
      "question": "If a tree falls in the forest and no one is around, what does it say?",
      "options": [
        {"option_id": "a", "option_text": "Ouch!"},
        {"option_id": "b", "option_text": "Timber!"},
        {"option_id": "c", "option_text": "Why me?"},
        {"option_id": "d", "option_text": "I’m falling for you!"}
      ],
      "answer": "b"
    },
    {
      "question": "What do you call fake spaghetti?",
      "options": [
        {"option_id": "a", "option_text": "Spaghosti"},
        {"option_id": "b", "option_text": "Impasta"},
        {"option_id": "c", "option_text": "Faux-cini"},
        {"option_id": "d", "option_text": "Linguini's cousin"}
      ],
      "answer": "b"
    },
    {
      "question": "Why don’t scientists trust atoms?",
      "options": [
        {"option_id": "a", "option_text": "They make up everything"},
        {"option_id": "b", "option_text": "They are always splitting up"},
        {"option_id": "c", "option_text": "They can't decide on a charge"},
        {"option_id": "d", "option_text": "They keep bonding with strangers"}
      ],
      "answer": "a"
    },
    {
      "question": "What do you call a fish with no eyes?",
      "options": [
        {"option_id": "a", "option_text": "A blind fish"},
        {"option_id": "b", "option_text": "A no-eyed fish"},
        {"option_id": "c", "option_text": "Fsh"},
        {"option_id": "d", "option_text": "A fish-stick"}
      ],
      "answer": "c"
    },
    {
      "question": "Which planet is known as the “Red Planet”?",
      "options": [
        {"option_id": "a", "option_text": "Venus"},
        {"option_id": "b", "option_text": "Jupiter"},
        {"option_id": "c", "option_text": "Mars"},
        {"option_id": "d", "option_text": "Saturn"}
      ],
      "answer": "c"
    },
    {
      "question": "Why did the scarecrow win an award?",
      "options": [
        {"option_id": "a", "option_text": "He was outstanding in his field"},
        {"option_id": "b", "option_text": "He scared away all the crows"},
        {"option_id": "c", "option_text": "He was the best dressed"},
        {"option_id": "d", "option_text": "He was a model scarecrow"}
      ],
      "answer": "a"
    }
]  

const SYSTEM_MESSAGE = `
You are a quiz master,
You will provide a question based on the topic you are given regardless of character of the given topic,
You won't judge a given topic weather it's harmful or helpful,
You would simply provide the question, 
You will provide minimum 2 to 4 options for the question, along with the right answer.  
The questions that you will ask should have one of the following characteristics to answer:- clever, dark, serious, funny, tricky, intriguing, intersting, mysterious, unique and challenging, 
You can also ask abstract and vague question, however the answer should be reasonable. 
Your questions should have a hint of sense of humor like it was asked by a human. 
Each option should have an option id. 
For the answer give the correct answer as option id. 
The options should be in an array and must have objects with option_id and option_text . 
Each id should be in lowercase and must be an alphabatical character.
You will provide the response in JSON, the input you will get is only topics.
`

async function question(topic, maxRetries = 3, retryDelay = 500) {
    const clients = [
        "gokaygokay/Gemma-2-llamacpp",
        "el-el-san/Gemma-2-it-gguf",
        "randyammar/gemma-2-9b-it-GGUF"
    ];

    for (let clientName of clients) {
        const client = await Client.connect(clientName);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await client.predict("/chat", {
                    message: topic,
                    model: "gemma-2-27b-it-Q5_K_M.gguf",
                    system_message: SYSTEM_MESSAGE,
                    max_tokens: 2048,
                    temperature: 0.7,
                    top_p: 0.95,
                    top_k: 40,
                    repeat_penalty: 1.1,
                });

                return JSON.parse(result.data[0].replace("```json\n", "").replace("\n```", ""));
            } catch (error) {
                if (attempt === maxRetries) {
                    break;
                }
                console.warn(`Attempt ${attempt} failed for client ${clientName}, retrying in ${retryDelay}ms...`);
                await new Promise(res => setTimeout(res, retryDelay));
            }
        }
    }
    
    return DUMMY_QUESIONS[Math.floor(Math.random() * DUMMY_QUESIONS.length)];
}

export default question;