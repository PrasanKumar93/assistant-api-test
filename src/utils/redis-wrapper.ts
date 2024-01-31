import { createClient } from 'redis';

type RedisClientType = ReturnType<typeof createClient>;

class RedisWrapperCls {
    connectionURL: string;
    nodeRedisClient: RedisClientType | null;

    constructor(_connectionURL: string) {
        this.connectionURL = _connectionURL;
        this.nodeRedisClient = null;
    }

    async getConnection() {
        if (!this.nodeRedisClient && this.connectionURL) {
            this.nodeRedisClient = createClient({ url: this.connectionURL });

            this.nodeRedisClient.on('error', (err) => {
                console.error('Redis Client Error', err);
            });

            await this.nodeRedisClient.connect();
            console.log('redis-wrapper ', 'Connected successfully to Redis');
        }
        return this.nodeRedisClient;
    }

    async closeConnection(): Promise<void> {
        if (this.nodeRedisClient) {
            await this.nodeRedisClient.disconnect();
        }
    }

    async getKeys(_pattern: string) {
        //@ts-ignore
        const result = await this.nodeRedisClient?.keys(_pattern);
        return result;
    }
}

let redisWrapperInst: RedisWrapperCls;

const setRedis = async (_connectionURL: string) => {
    redisWrapperInst = new RedisWrapperCls(_connectionURL);
    const nodeRedisClient = await redisWrapperInst.getConnection();
    return nodeRedisClient;
};

const getRedis = (): RedisWrapperCls => {
    return redisWrapperInst;
};
const getNodeRedisClient = () => {
    if (!redisWrapperInst.nodeRedisClient) {
        throw 'nodeRedisClient is not created!';
    }
    return redisWrapperInst.nodeRedisClient;
};

export {
    setRedis,
    getRedis,
    getNodeRedisClient
};

export type { RedisWrapperCls };
