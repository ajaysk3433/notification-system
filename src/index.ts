



import express from "express";
import firebaseApp from "./firebase/firebaseConfig.ts";
import { getMessaging, type BatchResponse } from "firebase-admin/messaging";
import FCMTokenRepository from "./repository/FCMToken.repository.ts";

import type { MessagingTopicManagementResponse } from 'firebase-admin/messaging'

const messaging = getMessaging(firebaseApp);

const app = express();

app.use(express.json());

/**
 * POST /subscribe
 * body:
 * {
 *   "userId": 1,
 *   "topic": "news"
 * }
 */
app.post('/subscribe-topic', async (req, res) => {
  try {
    const { topic, userId } = req.body;
    console.log("topic ", topic)

    if (!topic || !userId) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ARGUMENTS",
        message: 'topic and userId are required'
      });
    }
    if (typeof userId !== 'number') {
      return res.status(400).json({
        success: false,
        code: "INVALID_ARGUMENTS",
        message: 'userId must be a number'
      });
    }
    if (typeof topic !== 'string') {
      return res.status(400).json({
        success: false,
        code: "INVALID_ARGUMENTS",
        message: 'topic must be a string'
      });
    }
    //get all tokens of the user and topics
    const FCMTokens = await FCMTokenRepository.getByUserId(userId)
    const topics = FCMTokens.map((FCMToken) => FCMToken.topic.split(","))
    
    //flatten topics and add new topic to set
    const topicsSet = new Set(topics.flat())
    topicsSet.delete("") //remove empty topic if exists
    topicsSet.add(topic.toLowerCase())
    console.log("topics FCMTokens ", topicsSet)
    //update topics in database
    await FCMTokenRepository.updateTopicsByUserId(userId, topicsSet)


    //subscribe all tokens to all topics
    const response: MessagingTopicManagementResponse = await messaging.subscribeToTopic(
      FCMTokens.map((FCMToken) => FCMToken.token),
      topic.toLowerCase()
    )



    return res.json({
      success: true,
      response
    });

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      error: error.message
    });
  }
});

/**
 * POST /unsubscribe
 * body:
 * {
 *   "userId": 1,
 *   "topic": "news"
 * }
 */
app.post('/unsubscribe-topic', async (req, res) => {
  try {
    const { topic, userId } = req.body;


    //get all tokens of the user and topics
    const FCMTokens = await FCMTokenRepository.getByUserId(userId)
    const topics = FCMTokens.map((FCMToken) => FCMToken.topic.split(","))

    //flatten topics and add new topic to set
    const topicsSet = new Set(topics.flat())
    topicsSet.delete(topic.toLowerCase())
    //update topics in database
    await FCMTokenRepository.updateTopicsByUserId(userId, topicsSet)


    //Unsubscribe all tokens to all topic
    const response: MessagingTopicManagementResponse = await messaging.unsubscribeFromTopic(
      FCMTokens.map((FCMToken) => FCMToken.token),
      topic.toLowerCase()
    )


    return res.json({
      success: true,
      response
    });



  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/**
 * POST /send-topic
 * body:
 * {
 *   "topic": "news",
 *   "title": "Title",
 *   "body": "Body"
 * }
 */
app.post('/send-topic', async (req, res) => {
  try {
    const { topic, title, body } = req.body;

    const message = {
      notification: {
        title,
        body
      },
      topic
    };

    const response = await messaging.send(message);

    res.json({
      success: true,
      messageId: response
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/**
 * POST /send-indiviuals
 * body:
 * {
 *   "userIds": [1,2,3,4,5],
 *   "title": "Title",
 *   "body": "Body"
 * }
 */
app.post("/send-indiviuals", async (req, res) => {
  try {
    const { title, body, userIds } = req.body;
    console.log(userIds)

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ARGUMENTS",
        message: 'userIds must be a non-empty array'
      });
    }




    if (!title || !body) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ARGUMENTS",
        message: 'title and body are required'
      });
    }
    if (typeof title !== 'string' || typeof body !== 'string') {
      return res.status(400).json({
        success: false,
        code: "INVALID_ARGUMENTS",
        message: 'title and body must be strings'
      });
    }

    let failedTokens: object[] = [];
    let response: BatchResponse | string;

    const FCMTokens = await FCMTokenRepository.getManyByUserIds(userIds)

    const message = {
      notification: {
        title,
        body
      },
      tokens: FCMTokens.map((FCMToken) => FCMToken.token)
    };
    console.log(message)
    response = await messaging.sendEachForMulticast(message)
    console.log(response)

    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push({ token: FCMTokens[idx].token, reason: resp.error, id: FCMTokens[idx].id });
        }
      });
    }


    res.json({
      success: true,
      messageId: response,
      failedUserIds: failedTokens
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      error: error.message
    });
  }
})

app.post("/register", async (req, res) => {
  try {
    console.log(req.body);
    const { token, userId, deviceId } = req.body;

    if (!token || !userId || !deviceId) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ARGUMENTS",
        message: 'token and userId and deviceId are required'
      });
    }

    if (typeof token !== 'string' || typeof userId !== 'number' || typeof deviceId !== 'string') {
      return res.status(400).json({
        success: false,
        code: "INVALID_ARGUMENTS",
        message: 'token and userId and deviceId must be a string and number and string respectively'
      });
    }

    const FCMToken = await FCMTokenRepository.getByToken(token);
    const topics = FCMToken?.topic ? FCMToken.topic.split(",") : []
   

    // if (FCMToken) {
    //   return res.status(400).json({
    //     success: false,
    //     code: "TOKEN_ALREADY_EXISTS",
    //     message: 'Token already exists'
    //   });
    // }

    await FCMTokenRepository.create({
      token,
      user_id: userId,
      device_id: deviceId,
    });

     for (const topic of topics) {
      console.log("Unsubscribing from topic ", topic)
      if(topic.trim() === "") continue;
      const response = await messaging.unsubscribeFromTopic(token, topic.toLowerCase())
     
    }

    return res.json({
      success: true,
      message: 'Token registered successfully'
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      error: error.message
    });
  }
})


const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
