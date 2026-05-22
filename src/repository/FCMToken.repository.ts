import { prisma } from "../db/database.ts";

class FCMTokenRepository {
    async getByUserId(userId: number) {
        return await prisma.fCMToken.findMany({ where: { user_id: userId } })
    }

    async updateTopicsByUserId(userId: number, topics: Set<string>) {
        return await prisma.fCMToken.updateMany({
            where: { user_id: userId },
            data: { topic: Array.from(topics).join(",") }
        })
    }

    async getManyByUserIds(userIds: number[]) {
        return await prisma.fCMToken.findMany({ where: { user_id: { in: userIds } } })
    }



    async getByToken(token: string) {
        return await prisma.fCMToken.findUnique({ where: { token } })
    }

    async create(data: { token: string, user_id: number, device_id: string }) {
        return await prisma.fCMToken.upsert({
            where: {
                device_id: data.device_id
            },
            update: {
                token: data.token,
                user_id: data.user_id,
                topic: "",

            },
            create: {
                token: data.token,
                user_id: data.user_id,
                topic: "",
                device_id: data.device_id,
            }
        })
    }
}

export default new FCMTokenRepository();