'use server';

import ApiServer from '@/service/Api/ApiServer';

export async function sendReactionMessage(
  support_chat_id: string,
  reaction: string,
  message_id: string,
  chat_id: string,
) {
  try {
    const { FetchReq } = await ApiServer();

    const reactionPayload = {
      chat_id,
      message_id,
      reaction,
    };

    await FetchReq<null>({
      endpoint: 'SendReaction',
      body: reactionPayload,
      variables: [support_chat_id],
    });
  } catch (err) {
    console.log(err?.request);
    throw err;
  }
}
