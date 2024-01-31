import dotenv from 'dotenv';

import {
    createOpenAIInstance,
    uploadDataFileToOpenAI,
    createECommerceAssistant,
    createThreadPerUserSession,

    createUserMessageInThread,
    runThreadWithAssistant,
    pollThreadStatusTillComplete,
    getAllMessagesInThread
} from './my-open-ai.js';

import { setRedis, getNodeRedisClient } from './utils/redis-wrapper.js'

dotenv.config();

const REDIS_KEY_PREFIX = "assistantDemo:";
const CONFIG = {
    FILE_PATH: "../data/ecommerce.txt",
    REDIS_KEYS: {
        DATA_FILE_ID: `${REDIS_KEY_PREFIX}dataFileId`,
        ASSISTANT_ID: `${REDIS_KEY_PREFIX}assistantId`,
        USER_SESSION_THREAD_ID: `${REDIS_KEY_PREFIX}userSessionThreadId`,
    }
}

const init = async () => {

    // set up redis
    const redisConURL = process.env.REDIS_URL || "";
    await setRedis(redisConURL);

    // get redis client
    const redisClient = getNodeRedisClient();

    // set up openAI
    const key = process.env.OPEN_AI_API_KEY || "";
    const openAIInstance = createOpenAIInstance(key);

    let fileIdsArr: string[] = [];

    // upload data file to openAI
    let fileId = await redisClient.get(CONFIG.REDIS_KEYS.DATA_FILE_ID);
    if (!fileId) {
        const __dirname = new URL('.', import.meta.url).pathname;
        const filePath = __dirname + CONFIG.FILE_PATH;
        const file = await uploadDataFileToOpenAI(openAIInstance, filePath);
        fileId = file.id;

        await redisClient.set(CONFIG.REDIS_KEYS.DATA_FILE_ID, fileId);
    }
    else {
        console.log('---- fileId:' + fileId);
    }

    fileIdsArr.push(fileId); // can upload multiple files

    let assistantId = await redisClient.get(CONFIG.REDIS_KEYS.ASSISTANT_ID);
    if (!assistantId) {
        const assistant = await createECommerceAssistant(openAIInstance, fileIdsArr);
        assistantId = assistant.id;

        await redisClient.set(CONFIG.REDIS_KEYS.ASSISTANT_ID, assistantId);
    }
    else {
        console.log('---- assistantId:' + assistantId);
    }

    let threadId = await redisClient.get(CONFIG.REDIS_KEYS.USER_SESSION_THREAD_ID);
    if (!threadId) {
        const thread = await createThreadPerUserSession(openAIInstance);
        threadId = thread.id;

        await redisClient.set(CONFIG.REDIS_KEYS.USER_SESSION_THREAD_ID, threadId);
    }
    else {
        console.log('---- threadId:' + threadId);
    }

    let sampleQuestion = "What brands do you have in store?";
    //  sampleQuestion = "do you have shirts in store?";
    await testSampleUserQuestion(sampleQuestion, openAIInstance, assistantId, threadId);
}

const testSampleUserQuestion = async (sampleQuestion: string, openAIInstance, assistantId: string, threadId: string) => {

    // add user question in a thread
    await createUserMessageInThread(openAIInstance, threadId, sampleQuestion);

    // ask thread question to assistant
    let threadRun = await runThreadWithAssistant(openAIInstance, threadId, assistantId);
    const threadRunId = threadRun.id;

    // wait till thread is complete
    threadRun = await pollThreadStatusTillComplete(openAIInstance, threadId, threadRunId);
    if (threadRun.status === "completed") {
        const messages = await getAllMessagesInThread(openAIInstance, threadId);
        // console.log(JSON.stringify(messages));

        // Display the last message for the current run
        console.log(messages.data[0].content[0])//.text.value
    }
    else {
        console.log('threadRun.status:' + threadRun.status);
    }

    process.exit(0);
}

init();

