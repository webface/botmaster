import test from 'ava';
import { outgoingMessageFixtures,
         incomingUpdateFixtures,
         attachmentFixtures } from 'botmaster-test-fixtures';
import { assign } from 'lodash';

import MockBot from '../_mock_bot';

const sendMessageMacro = (t, params) => {
  t.plan(6);

  return new Promise((resolve) => {
    // always run both with and without callback
    let cbPassCount = 0;
    const cb = (err, body) => {
      // This needs to be a promise based callback.
      if (!body) {
        body = err;
        if (body instanceof Error) {
          t.false(true, err.message);
          resolve();
        }
      }

      t.deepEqual(assign({}, body.sentMessage), params.expectedSentMessage,
        'sentMessage is not same as message');
      t.truthy(body.recipient_id);
      t.truthy(body.message_id);

      cbPassCount += 1;
      if (cbPassCount === 2) {
        resolve();
      }
    };

    // test using promises
    params.sendMessageMethod().then(cb)
    .catch((err) => {
      t.false(true, err.message);
      resolve();
    });
    // and using standard callback function
    params.sendMessageMethod(cb);
  });
};

const sendCascadeMessageMacro = (t, params) => {
  t.plan(params.expectedSentMessages.length * 6);

  return new Promise((resolve) => {
    // always run both with and without callback
    let cbPassCount = 0;
    const cb = (err, bodies) => {
      // This needs to be a promise based callback.
      if (!bodies) {
        bodies = err;
        if (bodies instanceof Error) {
          t.false(true, err.message);
          resolve();
        }
      }

      for (let i = 0; i < bodies.length; i += 1) {
        const body = bodies[i];
        const sentMessage = body.sentMessage;
        const expectedSentMessage = params.expectedSentMessages[i];
        t.deepEqual(assign({}, sentMessage), expectedSentMessage,
          'sentMessage is not same as message');
        t.truthy(body.recipient_id);
        t.truthy(body.message_id);
      }

      cbPassCount += 1;
      if (cbPassCount === 2) {
        resolve();
      }
    };

    // test using promises
    params.sendMessageMethod().then(cb)
    .catch((err) => {
      t.false(true, err.message);
      resolve();
    });
    // and using standard callback function
    params.sendMessageMethod(cb);
  });
};

const sendMessageErrorMacro = (t, params) => {
  t.plan(2);

  return new Promise((resolve) => {
    // always run both with and without callback
    let cbPassCount = 0;
    const cb = (err) => {
      t.deepEqual(err.message, params.expectedErrorMessage,
        'Error message is not same as expected');

      cbPassCount += 1;
      if (cbPassCount === 2) {
        resolve();
      }
    };

    // test using promises
    params.sendMessageMethod()
    .then(() => {
      t.false(true, 'Error should have been returned, but didn\'t get any');
      resolve();
    })
    .catch(cb);
    // and using standard callback function
    params.sendMessageMethod(cb);
  });
};


// All tests are isolated in own scopes in order to be properly setup
{
  const bot = new MockBot();
  const messageToSend = outgoingMessageFixtures.audioMessage();

  test('#sendMessage works', sendMessageMacro, {
    sendMessageMethod: bot.sendMessage.bind(bot, messageToSend),
    expectedSentMessage: outgoingMessageFixtures.audioMessage(),
  });
}

{
  const bot = new MockBot();
  const messageToSend = outgoingMessageFixtures.audioMessage();

  test('#sendRaw works', sendMessageMacro, {
    sendMessageMethod: bot.sendRaw.bind(bot, messageToSend),
    expectedSentMessage: outgoingMessageFixtures.audioMessage(),
  });
}

{
  const bot = new MockBot();
  const messageToSend = outgoingMessageFixtures.audioMessage();

  test('#sendMessage works with sendOptions', sendMessageMacro, {
    sendMessageMethod: bot.sendMessage.bind(bot, messageToSend, { ignoreMiddleware: true }),
    expectedSentMessage: outgoingMessageFixtures.audioMessage(),
  });
}

{
  const bot = new MockBot();
  const subMessagePart = {
    text: 'Hello World!',
  };

  test('#sendMessageTo works', sendMessageMacro, {
    sendMessageMethod: bot.sendMessageTo.bind(bot, subMessagePart, 'user_id'),
    expectedSentMessage: outgoingMessageFixtures.textMessage(),
  });
}

{
  const bot = new MockBot({
    sends: {
      text: false,
    },
  });

  test('#sendTextMessageTo throws error if bot class does not support text', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendTextMessageTo.bind(bot, 'Hello World!', 'user_id'),
    expectedErrorMessage: 'Bots of type mock can\'t send messages with text',
  });
}

{
  const bot = new MockBot();

  test('#sendTextMessageTo works', sendMessageMacro, {
    sendMessageMethod: bot.sendTextMessageTo.bind(bot, 'Hello World!', 'user_id'),
    expectedSentMessage: outgoingMessageFixtures.textMessage(),
  });
}

{
  const bot = new MockBot({
    sends: {
      text: false,
    },
  });

  const updateToReplyTo = incomingUpdateFixtures.textUpdate();

  test('#reply throws error if bot class does not support text', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendTextMessageTo.bind(bot, updateToReplyTo, 'Hello World!'),
    expectedErrorMessage: 'Bots of type mock can\'t send messages with text',
  });
}

{
  const bot = new MockBot();

  const updateToReplyTo = incomingUpdateFixtures.textUpdate();
  // patching bot just to see if that works too with callbacks
  const patchedBot = bot.__createBotPatchedWithUpdate(updateToReplyTo);

  test('#reply works', sendMessageMacro, {
    sendMessageMethod: patchedBot.reply.bind(patchedBot, updateToReplyTo, 'Hello World!'),
    expectedSentMessage: outgoingMessageFixtures.textMessage(),
  });
}

{
  const bot = new MockBot({
    sends: {
      attachment: false,
    },
  });

  const attachment = attachmentFixtures.audioAttachment();

  test('#sendAttachmentTo throws error if bot class does not support attachment', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendAttachmentTo.bind(bot, attachment, 'user_id'),
    expectedErrorMessage: 'Bots of type mock can\'t send messages with attachment',
  });
}

{
  const bot = new MockBot();

  const attachment = attachmentFixtures.audioAttachment();

  test('#sendAttachmentTo works', sendMessageMacro, {
    sendMessageMethod: bot.sendAttachmentTo.bind(bot, attachment, 'user_id'),
    expectedSentMessage: outgoingMessageFixtures.audioMessage(),
  });
}

{
  const bot = new MockBot({
    sends: {
      attachment: false,
    },
  });

  test('#sendAttachmentFromUrlTo throws error if bot class does not support attachment', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendAttachmentFromUrlTo.bind(
      bot, 'audio', 'SOME_AUDIO_URL', 'user_id'),
    expectedErrorMessage: 'Bots of type mock can\'t send messages with attachment',
  });
}

{
  const bot = new MockBot();

  test('#sendAttachmentFromUrlTo works', sendMessageMacro, {
    sendMessageMethod: bot.sendAttachmentFromUrlTo.bind(
      bot, 'audio', 'SOME_AUDIO_URL', 'user_id'),
    expectedSentMessage: outgoingMessageFixtures.audioMessage(),
  });
}

{
  const bot = new MockBot({
    sends: {
      quickReply: false,
    },
  });

  test('#sendDefaultButtonMessageTo throws error if bot class does not support quickReply', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendDefaultButtonMessageTo.bind(
      bot, [], undefined, 'user_id'),
    expectedErrorMessage: 'Bots of type mock can\'t send messages with quick replies',
  });
}

{
  const bot = new MockBot({
    sends: {
      text: false,
      quickReply: true,
    },
  });

  test('#sendDefaultButtonMessageTo throws error if bot class does not support text and text is set', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendDefaultButtonMessageTo.bind(
      bot, [], 'Click on one of', 'user_id'),
    expectedErrorMessage: 'Bots of type mock can\'t send messages with text',
  });
}

{
  const bot = new MockBot({
    sends: {
      attachment: false,
      quickReply: true,
    },
  });

  test('#sendDefaultButtonMessageTo throws error if bot class does not support attachment and attachment is set', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendDefaultButtonMessageTo.bind(
      bot, [], attachmentFixtures.imageAttachment(), 'user_id'),
    expectedErrorMessage: 'Bots of type mock can\'t send messages with attachment',
  });
}

{
  const bot = new MockBot();
  const buttonTitles = ['B1', 'B2'];

  test('#sendDefaultButtonMessageTo throws error if textOrAttachment is not valid', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendDefaultButtonMessageTo.bind(
      bot, buttonTitles, new MockBot(), 'user_id'),
    expectedErrorMessage: 'third argument must be a "String", an attachment "Object" or absent',
  });
}

{
  const bot = new MockBot();
  const buttonTitles = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

  test('#sendDefaultButtonMessageTo throws error if textOrAttachment is not valid', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendDefaultButtonMessageTo.bind(
      bot, buttonTitles, undefined, 'user_id'),
    expectedErrorMessage: 'buttonTitles must be of length 10 or less',
  });
}

{
  const bot = new MockBot();
  const buttonTitles = ['B1', 'B2'];

  const quickReplies = [
    {
      content_type: 'text',
      title: 'B1',
      payload: 'B1',
    },
    {
      content_type: 'text',
      title: 'B2',
      payload: 'B2',
    },
  ];

  const expectedSentMessage = outgoingMessageFixtures.textOnlyQuickReplyMessage();
  expectedSentMessage.message.quick_replies = quickReplies;

  test('#sendDefaultButtonMessageTo works with falsy textOrAttachment', sendMessageMacro, {
    expectedSentMessage,
    sendMessageMethod: bot.sendDefaultButtonMessageTo.bind(
      bot, buttonTitles, undefined, 'user_id'),
  });
}

{
  const bot = new MockBot();
  const buttonTitles = ['B1', 'B2'];

  const quickReplies = [
    {
      content_type: 'text',
      title: 'B1',
      payload: 'B1',
    },
    {
      content_type: 'text',
      title: 'B2',
      payload: 'B2',
    },
  ];

  const expectedSentMessage = outgoingMessageFixtures.textOnlyQuickReplyMessage();
  expectedSentMessage.message.quick_replies = quickReplies;
  expectedSentMessage.message.text = 'Click one of:';

  test('#sendDefaultButtonMessageTo works with text type textOrAttachment', sendMessageMacro, {
    expectedSentMessage,
    sendMessageMethod: bot.sendDefaultButtonMessageTo.bind(
      bot, buttonTitles, 'Click one of:', 'user_id'),
  });
}

{
  const bot = new MockBot();
  const buttonTitles = ['B1', 'B2'];

  const quickReplies = [
    {
      content_type: 'text',
      title: 'B1',
      payload: 'B1',
    },
    {
      content_type: 'text',
      title: 'B2',
      payload: 'B2',
    },
  ];

  const expectedSentMessage = outgoingMessageFixtures.textOnlyQuickReplyMessage();
  expectedSentMessage.message.quick_replies = quickReplies;
  delete expectedSentMessage.message.text;
  expectedSentMessage.message.attachment = attachmentFixtures.imageAttachment();

  test('#sendDefaultButtonMessageTo works with object type textOrAttachment', sendMessageMacro, {
    expectedSentMessage,
    sendMessageMethod: bot.sendDefaultButtonMessageTo.bind(
      bot, buttonTitles, attachmentFixtures.imageAttachment(), 'user_id'),
  });
}

{
  const bot = new MockBot({
    sends: {
      text: false,
    },
  });

  test('#sendIsTypingMessageTo throws error if bot class does not support typing_on sender action', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendIsTypingMessageTo.bind(bot, 'user_id'),
    expectedErrorMessage: 'Bots of type mock can\'t send messages with typing_on sender action',
  });
}

{
  const bot = new MockBot();

  test('#sendIsTypingMessageTo works', sendMessageMacro, {
    sendMessageMethod: bot.sendIsTypingMessageTo.bind(bot, 'user_id'),
    expectedSentMessage: outgoingMessageFixtures.typingOnMessage(),
  });
}

{
  const bot = new MockBot();

  test('#sendCascade throws error when used with no valid params', sendMessageErrorMacro, {
    sendMessageMethod: bot.sendCascade.bind(bot, [{}]),
    expectedErrorMessage: 'No valid message options specified',
  });
}

{
  const bot = new MockBot();

  const rawMessage1 = {
    nonStandard: 'message1',
    recipient: {
      id: 'user_id',
    },
  };
  const rawMessage2 = {
    nonStandard: 'message2',
    recipient: {
      id: 'user_id',
    },
  };

  const messageArray = [{ raw: rawMessage1 }, { raw: rawMessage2 }];
  const expectedSentMessages = [rawMessage1, rawMessage2];

  test('#sendCascade works with raw messages', sendCascadeMessageMacro, {
    sendMessageMethod: bot.sendCascade.bind(bot, messageArray),
    expectedSentMessages,
  });
}

{
  const bot = new MockBot();

  const message1 = outgoingMessageFixtures.textOnlyQuickReplyMessage();
  const message2 = outgoingMessageFixtures.imageMessage();

  const messageArray = [{ message: message1 }, { message: message2 }];
  const expectedSentMessages = [message1, message2];

  test('#sendCascade works with valid messages', sendCascadeMessageMacro, {
    sendMessageMethod: bot.sendCascade.bind(bot, messageArray),
    expectedSentMessages,
  });
}

{
  const bot = new MockBot();

  const message1 = outgoingMessageFixtures.textOnlyQuickReplyMessage();

  const messageArray = [{ message: message1 }];
  const expectedSentMessages = [message1];

  test('#sendCascade works with single valid messages', sendCascadeMessageMacro, {
    sendMessageMethod: bot.sendCascade.bind(bot, messageArray),
    expectedSentMessages,
  });
}

{
  const bot = new MockBot();

  const rawMessage1 = {
    nonStandard: 'message1',
    recipient: {
      id: 'user_id',
    },
  };
  const message2 = outgoingMessageFixtures.imageMessage();

  const messageArray = [{ raw: rawMessage1 }, { message: message2 }];
  const expectedSentMessages = [rawMessage1, message2];

  test('#sendCascade works with mixed raw and botmaster messages', sendCascadeMessageMacro, {
    sendMessageMethod: bot.sendCascade.bind(bot, messageArray),
    expectedSentMessages,
  });
}


{
  const bot = new MockBot();

  const textArray = ['Hello World!', 'Goodbye World!'];
  const secondExpectedMessage = outgoingMessageFixtures.textMessage();
  secondExpectedMessage.message.text = 'Goodbye World!';
  const expectedSentMessages = [
    outgoingMessageFixtures.textMessage(),
    secondExpectedMessage,
  ];

  test('#sendTextCascadeTo works', sendCascadeMessageMacro, {
    sendMessageMethod: bot.sendTextCascadeTo.bind(bot, textArray, 'user_id'),
    expectedSentMessages,
  });
}