
import OpenAI from 'openai';
import * as fs from 'node:fs';

let openAIInstance: OpenAI | null = null;

const createOpenAIInstance = (key: string): OpenAI => {
    if (!key) {
        throw new Error("OpenAI API key is missing.");
    }

    if (!openAIInstance) {
        openAIInstance = new OpenAI({
            apiKey: key,
        });
    }

    return openAIInstance;
}


const uploadDataFileToOpenAI = async (openAIInstance: OpenAI, filePath: string) => {
    if (!openAIInstance || !filePath) {
        throw new Error("OpenAI instance or file path is missing");
    }

    const fileReadStream = fs.createReadStream(filePath, {
        encoding: 'utf8',
    });
    const file = await openAIInstance.files.create({
        file: fileReadStream,
        purpose: "assistants",
    });
    console.log('New file Id : ' + file.id);
    /*
        {
            object: 'file',
            id: 'file-zDqAImx89zf8rERsSPSrdMB9',
            purpose: 'assistants',
            filename: 'ecommerce.txt',
            bytes: 15932,
            created_at: 1706687958,
            status: 'processed',
            status_details: null
        }
    */

    return file;
}

const createECommerceAssistant = async (openAIInstance: OpenAI, fileIdsArr: string[]) => {
    if (!openAIInstance || !fileIdsArr) {
        throw new Error("OpenAI instance or file ids array is missing");
    }

    const myAssistant = await openAIInstance.beta.assistants.create({
        instructions: `Please assume the persona of a retail shopping assistant.
        Use a friendly tone, and assume the target audience are normal people looking for a product in a ecommerce website.
        
        Answer the question based on the file data provided which contains different products and it's details.
    
        If you  don't know the answer, please direct the questioner to email help@redis.com. Don't try to suggest any product out of context as it may not be in the store.

        Let the answer include product display name, price and optional other details based on question asked.

        Let the product display name be a link like <a href="/?productId="> productDisplayName </a>
        so that user can click on it and go to the product page with help of productId.
        `,
        name: "Ecommerce Recommendation Expert",
        tools: [{ type: "retrieval" }],
        model: "gpt-4-1106-preview",
        file_ids: fileIdsArr
    });

    console.log('New assistant id : ' + myAssistant.id);

    /*
        {
            id: 'asst_1HjzI9NkBkm20hJaN1nDIhBu',
            object: 'assistant',
            created_at: 1706688285,
            name: 'Ecommerce Recommendation Expert',
            description: null,
            model: 'gpt-4-1106-preview',
            instructions: 'Please assume the persona of a retail shopping assistant ...',
            tools: [ { type: 'retrieval' } ],
            file_ids: [ 'file-zDqAImx89zf8rERsSPSrdMB9' ],
            metadata: {}
        }
    */

    return myAssistant;
}

const createThreadPerUserSession = async (openAIInstance: OpenAI) => {
    //thread keep tracks of conversation between user and assistant
    const thread = await openAIInstance.beta.threads.create();
    console.log('New user thread id : ' + thread.id);
    /*
      {
        id: 'thread_YhSls43xthFJgadjnFfLtP56',
        object: 'thread',
        created_at: 1706688740,
        metadata: {}
        }
     */
    return thread;
}

const createUserMessageInThread = async (openAIInstance: OpenAI, threadId: string, message: string) => {
    const messageObj = await openAIInstance.beta.threads.messages.create(
        threadId,
        { role: "user", content: message }
    );
    console.log('New user messageId:' + messageObj.id);
    return messageObj;
}

const getAllMessagesInThread = async (openAIInstance: OpenAI, threadId: string) => {
    const messages = await openAIInstance.beta.threads.messages.list(threadId);
    //console.log(messages);
    return messages;
}

const runThreadWithAssistant = async (openAIInstance: OpenAI, threadId: string, assistantId: string) => {
    const threadRun = await openAIInstance.beta.threads.runs.create(
        threadId,
        {
            assistant_id: assistantId,
            //instructions: `Please Keep your answers short and remove annotations.`,
        }
    );
    console.log('New threadRunId:' + threadRun.id);
    return threadRun; //threadRun.id
}

const getRunningThreadForStatus = async (openAIInstance: OpenAI, threadId: string, threadRunId: string) => {
    const threadRun = await openAIInstance.beta.threads.runs.retrieve(
        threadId,
        threadRunId
    );
    // console.log(threadRun);
    return threadRun; //threadRun.status
}

const pollThreadStatusTillComplete = async (openAIInstance: OpenAI, threadId: string, threadRunId: string, pollTimeInMs?: number) => {
    if (!pollTimeInMs) {
        pollTimeInMs = 1000;
    }
    let threadRun = await getRunningThreadForStatus(openAIInstance, threadId, threadRunId);
    console.log('pollThreadStatus:' + threadRun.status);
    while (threadRun.status === "queued" || threadRun.status === "in_progress") {
        await new Promise(resolve => setTimeout(resolve, pollTimeInMs));

        threadRun = await getRunningThreadForStatus(openAIInstance, threadId, threadRunId);
    }
    return threadRun;
    // https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
}

export {
    createOpenAIInstance,
    uploadDataFileToOpenAI,
    createECommerceAssistant,
    createThreadPerUserSession,
    createUserMessageInThread,
    runThreadWithAssistant,
    pollThreadStatusTillComplete,
    getAllMessagesInThread,
}