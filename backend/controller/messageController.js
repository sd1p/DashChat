const asyncHandler = require("express-async-handler");
const User = require("../model/userModel");
const Message = require("../model/messageModel");
const Chat = require("../model/chatModel");
const mongoose = require("mongoose");

exports.sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;
  if (!content || mongoose.isValidObjectId(!chatId)) {
    return res
      .status(400)
      .json({ message: "Provide valid content and chatId" });
  }
  let newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };
  console.log(chatId);
  try {
    let message = await Message.create(newMessage);
    message = await message.populate("sender", "name photo");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name photo email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: message,
    });

    res.status(201).json({ user: req.body._user, message });
  } catch (error) {
    console.log(error);
    throw new Error(error.messages);
  }
});

exports.getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!mongoose.isValidObjectId(chatId)) {
    console.log(chatId);
    res.status(400).json({ message: "Invalid Chat ID" });
  }
  try {
    const userId = req.user._id;
    const lastSeenTimestamp = new Date().toISOString();

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, users: userId },
      { $set: { [`lastSeen.${userId}`]: lastSeenTimestamp } },
      { new: true }
    );

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "name photo email")
      .populate("chat");
    res.status(200).json({ messages });
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
});

exports.markAsSeen = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!mongoose.isValidObjectId(chatId)) {
    console.log(chatId);
    res.status(400).json({ message: "Invalid Chat ID" });
  }
  try {
    const userId = req.user._id;
    const lastSeenTimestamp = new Date().toISOString();

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, users: userId },
      { $set: { [`lastSeen.${userId}`]: lastSeenTimestamp } },
      { new: true }
    );
    res.status(200).json({ message: `seen ${chatId}` });
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
});
